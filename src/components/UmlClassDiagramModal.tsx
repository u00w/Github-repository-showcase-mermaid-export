import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  Copy,
  Check,
  Code,
  FileCode,
  Layers,
  Search,
  Loader2,
  RefreshCw,
  Box,
} from 'lucide-react';
import {
  FullRepoResponse,
  UmlDiagramData,
  UmlClass,
  UmlRelationship,
  UmlStereotype,
} from '../types';
import { generateDefaultUmlDiagram, generateMermaidCode, generatePlantUmlCode } from '../utils/umlGenerator';

interface UmlClassDiagramModalProps {
  data: FullRepoResponse;
  isOpen: boolean;
  onClose: () => void;
}

export const UmlClassDiagramModal: React.FC<UmlClassDiagramModalProps> = ({
  data,
  isOpen,
  onClose,
}) => {
  const { repo, tree, readme } = data;

  const [diagram, setDiagram] = useState<UmlDiagramData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'visual' | 'mermaid' | 'plantuml' | 'specs'>('visual');
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [zoom, setZoom] = useState<number>(1);
  const [focusPrompt, setFocusPrompt] = useState<string>('');
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [isAiGenerated, setIsAiGenerated] = useState<boolean>(false);

  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; initialX: number; initialY: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && !diagram) {
      loadDiagram();
    }
  }, [isOpen, repo.full_name]);

  // Lay out class nodes in a grid whenever diagram changes
  useEffect(() => {
    if (!diagram) return;
    const newPositions: Record<string, { x: number; y: number }> = {};
    (diagram.classes || []).forEach((cls, idx) => {
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      newPositions[cls.id] = {
        x: 60 + col * 360,
        y: 120 + row * 320,
      };
    });
    setNodePositions(newPositions);
  }, [diagram]);

  const loadDiagram = async (customPrompt?: string) => {
    setIsLoading(true);

    try {
      const res = await fetch('/api/gemini/uml-diagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoName: repo.name,
          language: repo.language,
          description: repo.description,
          topics: repo.topics,
          tree: tree,
          readmeSnippet: readme,
          focusPrompt: customPrompt || focusPrompt,
        }),
      });

      if (res.ok) {
        const aiDiagram: UmlDiagramData = await res.json();
        if (aiDiagram && Array.isArray(aiDiagram.classes) && aiDiagram.classes.length >= 2) {
          const mermaid = generateMermaidCode(aiDiagram.classes, aiDiagram.relationships);
          const plantUml = generatePlantUmlCode(aiDiagram.classes, aiDiagram.relationships);
          setDiagram({ ...aiDiagram, mermaidCode: mermaid, plantUmlCode: plantUml });
          setIsAiGenerated(true);
          setIsLoading(false);
          return;
        }
      }
    } catch (err) {
      console.warn('Gemini UML endpoint unavailable, using deterministic architecture analyzer:', err);
    }

    const fallback = generateDefaultUmlDiagram(data, customPrompt || focusPrompt);
    setDiagram(fallback);
    setIsAiGenerated(false);
    setIsLoading(false);
  };

  if (!isOpen) return null;

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleMouseDownNode = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDraggingNodeId(id);
    const currentPos = nodePositions[id] || { x: 0, y: 0 };
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      initialX: currentPos.x,
      initialY: currentPos.y,
    };
  };

  const handleMouseMoveCanvas = (e: React.MouseEvent) => {
    if (!draggingNodeId || !dragStartRef.current) return;
    const dx = (e.clientX - dragStartRef.current.mouseX) / zoom;
    const dy = (e.clientY - dragStartRef.current.mouseY) / zoom;
    setNodePositions((prev) => ({
      ...prev,
      [draggingNodeId]: {
        x: Math.max(10, dragStartRef.current!.initialX + dx),
        y: Math.max(10, dragStartRef.current!.initialY + dy),
      },
    }));
  };

  const handleMouseUpCanvas = () => {
    setDraggingNodeId(null);
    dragStartRef.current = null;
  };

  const filteredClasses = (diagram?.classes || []).filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.packageName && c.packageName.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  const selectedClass = diagram?.classes.find((c) => c.id === selectedClassId);

  const getStereotypeBadge = (stereotype?: UmlStereotype) => {
    switch (stereotype) {
      case 'interface': return 'bg-purple-500/10 text-purple-300 border-purple-500/30';
      case 'service':   return 'bg-blue-500/10 text-blue-300 border-blue-500/30';
      case 'component': return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
      case 'controller':return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
      case 'abstract':  return 'bg-rose-500/10 text-rose-300 border-rose-500/30';
      case 'model':     return 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30';
      default:          return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const allRelationships = diagram?.relationships || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-hidden select-none">
      <div className="relative w-full max-w-7xl h-[94vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-slate-800 bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#eab308]/20 border border-[#eab308]/40 text-[#eab308]">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold font-mono tracking-wider text-slate-300 uppercase">
                UML Class Diagram
              </span>
              <p className="text-[11px] text-slate-500 font-mono">{repo.full_name}</p>
            </div>
            {isAiGenerated && (
              <span className="px-2 py-0.5 text-[10px] bg-[#eab308]/20 border border-[#eab308]/40 text-[#eab308] font-mono">AI</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadDiagram()}
              disabled={isLoading}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
              <span>Reanalyze</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 bg-slate-800/80 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 transition-colors border border-slate-700/60"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs & search/zoom */}
        <div className="bg-slate-950/40 border-b border-slate-800 px-5 py-2 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1 bg-slate-900 p-1 border border-slate-800">
            {([
              { key: 'visual',   icon: Box,      label: 'Class Diagram' },
              { key: 'mermaid',  icon: Code,     label: 'Mermaid' },
              { key: 'plantuml', icon: FileCode,  label: 'PlantUML' },
              { key: 'specs',    icon: Layers,    label: `Inventory (${diagram?.classes.length ?? 0})` },
            ] as const).map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-3 py-1.5 text-xs font-medium transition-all flex items-center gap-1.5 ${
                  activeTab === key ? 'bg-[#eab308] text-slate-950' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          {activeTab === 'visual' && (
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter nodes..."
                  className="bg-slate-900 border border-slate-800 pl-8 pr-2 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#eab308] w-32 sm:w-40"
                />
              </div>
              <div className="flex items-center gap-1 bg-slate-900 p-1 border border-slate-800">
                <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))} className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded">
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] font-mono text-slate-400 px-1">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom((z) => Math.min(2, z + 0.1))} className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded">
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-hidden relative bg-[#181820]">

          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-3 bg-slate-950/80 backdrop-blur-sm z-30">
              <Loader2 className="w-8 h-8 text-[#eab308] animate-spin" />
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-slate-200">Building UML Architecture Model…</h3>
                <p className="text-xs text-slate-400">Synthesizing source files, dependencies, and component subsystems.</p>
              </div>
            </div>
          )}

          {/* TAB 1: VISUAL CANVAS */}
          {activeTab === 'visual' && diagram && (
            <div
              ref={canvasRef}
              onMouseMove={handleMouseMoveCanvas}
              onMouseUp={handleMouseUpCanvas}
              className="w-full h-full overflow-auto relative p-8 cursor-grab active:cursor-grabbing"
            >
              {/* Diagram title */}
              <div className="absolute top-6 left-1/2 -translate-x-1/2 text-center pointer-events-none z-10">
                <h1 className="text-4xl sm:text-5xl font-serif italic text-slate-100/90 tracking-wide font-light drop-shadow-md">
                  Class Diagram
                </h1>
                <p className="text-xs text-slate-400 font-sans tracking-wide mt-1 opacity-80">
                  {repo.full_name} Architecture
                </p>
              </div>

              {/* Canvas container */}
              <div
                className="relative min-w-[1200px] min-h-[900px] pt-24 pb-32"
                style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
              >

                {/* SVG connectors */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                  <defs>
                    <marker id="arrow-open" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M 0 1 L 10 5 L 0 9" fill="none" stroke="#f43f5e" strokeWidth="1.5" />
                    </marker>
                    <marker id="arrow-white" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
                      <path d="M 0 0 L 10 5 L 0 10 Z" fill="#20202d" stroke="#818cf8" strokeWidth="1.5" />
                    </marker>
                    <marker id="diamond-filled" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
                      <path d="M 0 5 L 5 0 L 10 5 L 5 10 Z" fill="#10b981" stroke="#10b981" strokeWidth="1" />
                    </marker>
                    <marker id="diamond-hollow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
                      <path d="M 0 5 L 5 0 L 10 5 L 5 10 Z" fill="#20202d" stroke="#f59e0b" strokeWidth="1.5" />
                    </marker>
                  </defs>

                  {allRelationships.map((rel) => {
                    const fromPos = nodePositions[rel.fromId];
                    const toPos   = nodePositions[rel.toId];
                    if (!fromPos || !toPos) return null;

                    const x1 = fromPos.x + 140;
                    const y1 = fromPos.y + 70;
                    const x2 = toPos.x + 140;
                    const y2 = toPos.y + 70;

                    let strokeColor = '#64748b';
                    let strokeDash  = 'none';
                    let markerEnd   = '';
                    let markerStart = '';

                    switch (rel.type) {
                      case 'inheritance':
                        strokeColor = '#818cf8'; markerEnd = 'url(#arrow-white)';
                        break;
                      case 'realization':
                        strokeColor = '#c084fc'; strokeDash = '6 4'; markerEnd = 'url(#arrow-white)';
                        break;
                      case 'composition':
                        strokeColor = '#10b981'; markerStart = 'url(#diamond-filled)';
                        break;
                      case 'aggregation':
                        strokeColor = '#f59e0b'; markerStart = 'url(#diamond-hollow)';
                        break;
                      case 'dependency':
                        strokeColor = '#f43f5e'; strokeDash = '5 5'; markerEnd = 'url(#arrow-open)';
                        break;
                      default:
                        strokeColor = '#94a3b8'; markerEnd = 'url(#arrow-open)';
                    }

                    if (rel.fromId === rel.toId) {
                      const loopD = `M ${x1 + 40} ${y1 - 30} C ${x1 + 110} ${y1 - 100}, ${x1 + 110} ${y1 + 60}, ${x1 + 40} ${y1 + 30}`;
                      return (
                        <g key={rel.id}>
                          <path d={loopD} fill="none" stroke={strokeColor} strokeWidth="2.5" strokeDasharray={strokeDash} markerEnd={markerEnd} className="transition-all duration-300 opacity-80 hover:opacity-100" />
                          {rel.label && (
                            <g transform={`translate(${x1 + 110}, ${y1 - 20})`}>
                              <rect x={-50} y={-10} width={100} height={20} rx={5} fill="#0f172a" stroke={strokeColor} strokeWidth={1} opacity={0.95} />
                              <text x={0} y={3} fill="#cbd5e1" fontSize={10} fontFamily="monospace" textAnchor="middle" fontWeight="600">{rel.label}</text>
                            </g>
                          )}
                        </g>
                      );
                    }

                    const dx   = Math.abs(x2 - x1) * 0.5;
                    const pathD = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
                    const midX  = (x1 + x2) / 2;
                    const midY  = (y1 + y2) / 2;

                    return (
                      <g key={rel.id}>
                        <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="2.5" strokeDasharray={strokeDash} markerEnd={markerEnd} markerStart={markerStart} className="transition-all duration-300 opacity-85 hover:opacity-100" />
                        {rel.label && (
                          <g transform={`translate(${midX}, ${midY})`}>
                            <rect x={-(rel.label.length * 3.5 + 8)} y={-10} width={rel.label.length * 7 + 16} height={20} rx={5} fill="#0f172a" stroke={strokeColor} strokeWidth={1} opacity={0.95} />
                            <text x={0} y={3} fill="#e2e8f0" fontSize={10} fontFamily="monospace" textAnchor="middle" fontWeight="600">{rel.label}</text>
                          </g>
                        )}
                      </g>
                    );
                  })}
                </svg>

                {/* Class nodes */}
                <div className="relative z-10">
                  {filteredClasses.map((cls) => {
                    const pos = nodePositions[cls.id] || { x: 50, y: 50 };
                    const isSelected = selectedClassId === cls.id;

                    return (
                      <div
                        key={cls.id}
                        onMouseDown={(e) => handleMouseDownNode(e, cls.id)}
                        onClick={() => setSelectedClassId(isSelected ? null : cls.id)}
                        style={{ position: 'absolute', left: `${pos.x}px`, top: `${pos.y}px` }}
                        className={`w-72 bg-[#2d2d3a] border-2 shadow-2xl transition-all overflow-hidden cursor-move ${
                          isSelected
                            ? 'border-indigo-400 ring-4 ring-indigo-500/20 shadow-indigo-500/20'
                            : 'border-slate-600/90 hover:border-slate-400'
                        }`}
                      >
                        {/* Class header */}
                        <div className="bg-[#242431] px-4 py-2.5 text-center border-b border-slate-700/80">
                          {cls.stereotype && (
                            <div className="text-[10px] font-mono text-indigo-300 font-semibold tracking-wider">
                              «{cls.stereotype}»
                            </div>
                          )}
                          <div className="text-base font-bold font-mono text-white tracking-tight">{cls.name}</div>
                        </div>

                        {/* Attributes */}
                        {cls.attributes.length > 0 && (
                          <div className="p-3 border-b border-slate-700/60 bg-[#282835] font-mono text-xs text-slate-200 space-y-1">
                            {cls.attributes.map((attr, idx) => (
                              <div key={idx} className="flex items-center gap-1.5 truncate">
                                <span className="font-bold text-indigo-400">{attr.visibility || '-'}</span>
                                <span className="text-slate-100">{attr.name}</span>
                                {attr.type && <span className="text-purple-300 text-[11px]">: {attr.type}</span>}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Methods */}
                        {cls.methods.length > 0 && (
                          <div className="p-3 bg-[#242431] font-mono text-xs text-slate-200 space-y-1">
                            {cls.methods.map((m, idx) => (
                              <div key={idx} className="truncate">
                                <span className="font-bold text-emerald-400 mr-1">{m.visibility || '+'}</span>
                                <span className="text-slate-100">{m.name}()</span>
                                {m.returnType && <span className="text-purple-300 text-[11px]"> : {m.returnType}</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: MERMAID */}
          {activeTab === 'mermaid' && diagram && (
            <div className="h-full flex flex-col p-6 space-y-4 overflow-y-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-200">Mermaid.js UML Diagram Syntax</h3>
                  <p className="text-xs text-slate-400">Embed directly into GitHub Markdown or the Mermaid live editor.</p>
                </div>
                <button
                  onClick={() => handleCopy(diagram.mermaidCode || '', 'mermaid')}
                  className="px-3 py-1.5 bg-[#eab308] hover:bg-[#facc15] text-slate-950 text-xs font-medium transition-colors flex items-center gap-1.5"
                >
                  {copiedType === 'mermaid' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedType === 'mermaid' ? 'Copied!' : 'Copy Mermaid'}</span>
                </button>
              </div>
              <pre className="p-4 bg-slate-950 border border-slate-800 text-xs font-mono text-[#eab308] overflow-x-auto leading-relaxed shadow-inner">
                {diagram.mermaidCode}
              </pre>
            </div>
          )}

          {/* TAB 3: PLANTUML */}
          {activeTab === 'plantuml' && diagram && (
            <div className="h-full flex flex-col p-6 space-y-4 overflow-y-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-200">PlantUML Diagram Specification</h3>
                  <p className="text-xs text-slate-400">Compatible with PlantUML servers, VS Code, and IntelliJ plugins.</p>
                </div>
                <button
                  onClick={() => handleCopy(diagram.plantUmlCode || '', 'plantuml')}
                  className="px-3 py-1.5 bg-[#eab308] hover:bg-[#facc15] text-slate-950 text-xs font-medium transition-colors flex items-center gap-1.5"
                >
                  {copiedType === 'plantuml' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedType === 'plantuml' ? 'Copied!' : 'Copy PlantUML'}</span>
                </button>
              </div>
              <pre className="p-4 bg-slate-950 border border-slate-800 text-xs font-mono text-[#eab308] overflow-x-auto leading-relaxed shadow-inner">
                {diagram.plantUmlCode}
              </pre>
            </div>
          )}

          {/* TAB 4: SPECS INVENTORY */}
          {activeTab === 'specs' && diagram && (
            <div className="h-full p-6 overflow-y-auto space-y-6">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-200">Architectural Class Inventory</h3>
                <p className="text-xs text-slate-400">Complete listing of classes, packages, attributes, and operations.</p>
              </div>
              <div className="overflow-x-auto border border-slate-800 bg-slate-900">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3">Class</th>
                      <th className="p-3">Stereotype</th>
                      <th className="p-3">Package</th>
                      <th className="p-3">Attributes</th>
                      <th className="p-3">Methods</th>
                      <th className="p-3">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-mono">
                    {diagram.classes.map((cls) => (
                      <tr key={cls.id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="p-3 font-bold text-slate-100">{cls.name}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 text-[10px] rounded border ${getStereotypeBadge(cls.stereotype)}`}>
                            {cls.stereotype || 'class'}
                          </span>
                        </td>
                        <td className="p-3 text-slate-400">{cls.packageName || 'N/A'}</td>
                        <td className="p-3 text-indigo-400">{cls.attributes.length}</td>
                        <td className="p-3 text-emerald-400">{cls.methods.length}</td>
                        <td className="p-3 text-slate-300 font-sans text-xs">{cls.description || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-200">{diagram?.classes.length ?? 0} Classes</span>
            <span>•</span>
            <span className="font-semibold text-slate-200">{allRelationships.length} Relationships</span>
            {diagram?.summary && (
              <>
                <span>•</span>
                <span className="hidden sm:inline truncate max-w-xs text-slate-400">{diagram.summary}</span>
              </>
            )}
          </div>
          <button
            onClick={() => handleCopy(JSON.stringify(diagram, null, 2), 'json')}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors flex items-center gap-1.5"
          >
            {copiedType === 'json' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Export JSON</span>
          </button>
        </div>

      </div>
    </div>
  );
};
