import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, GitBranch } from 'lucide-react';
import { UmlClass, UmlRelationship } from '../types';

interface WebArchitectureDiagramProps {
  classes: UmlClass[];
  relationships: UmlRelationship[];
  repoFullName: string;
  defaultBranch: string;
}

interface Position { x: number; y: number; }
interface Connection {
  id: string;
  path: string;
  label: string;
  labelX: number;
  labelY: number;
  dashed: boolean;
  color: string;
  labelBackground: string;
  labelBorder: string;
}

const GROUPS = [
  { name: 'Input & menus', match: /menu|ui|input|hud|screen|panel|button|view|camera/i },
  { name: 'Managers & systems', match: /manager|controller|game|simulation|service|system|state/i },
  { name: 'World & roads', match: /road|world|map|terrain|vehicle|traffic|path|location/i },
  { name: 'Data & support', match: /model|data|config|repository|save|event|player/i },
];
const GROUP_X_POSITIONS = [0.08, 0.36, 0.64, 0.92];

const getGroupIndex = (umlClass: UmlClass) => {
  const descriptor = `${umlClass.name} ${umlClass.packageName || ''} ${umlClass.stereotype || ''}`;
  return GROUPS.findIndex((group) => group.match.test(descriptor));
};

const memberText = (member: { visibility?: string; name: string; type?: string; parameters?: string; returnType?: string }, isMethod = false) =>
  isMethod
    ? `${member.visibility || '+'}${member.name}(${member.parameters || ''}) : ${member.returnType || 'void'}`
    : `${member.visibility || '+'}${member.name}: ${member.type || 'unknown'}`;

const estimateNodeHeight = (umlClass: UmlClass) => {
  const members = [
    ...umlClass.attributes.map((attribute) => memberText(attribute)),
    ...umlClass.methods.map((method) => memberText(method, true)),
  ];
  const textLines = members.reduce((total, member) => total + Math.max(1, Math.ceil(member.length / 27)), 0);
  return 58 + textLines * 15;
};

const getClusteredLayout = (classes: UmlClass[]) => {
  const clusters = GROUPS.map(() => [] as UmlClass[]);
  const other: UmlClass[] = [];
  classes.forEach((umlClass) => {
    const index = getGroupIndex(umlClass);
    if (index === -1) other.push(umlClass);
    else clusters[index].push(umlClass);
  });

  // Unclassified nodes join the support column, keeping every card in a collision-free lane.
  clusters[3].push(...other);
  const tallestCluster = Math.max(...clusters.map((cluster) => cluster.reduce((total, umlClass) => total + estimateNodeHeight(umlClass) + 30, 0)));
  const canvasHeight = Math.max(640, tallestCluster + 110);
  const positions: Record<string, Position> = {};
  clusters.forEach((cluster, groupIndex) => {
    let cursorY = 64;
    cluster.forEach((umlClass) => {
      const nodeHeight = estimateNodeHeight(umlClass);
      positions[umlClass.id] = {
        x: GROUP_X_POSITIONS[groupIndex],
        y: cursorY + nodeHeight / 2,
      };
      cursorY += nodeHeight + 30;
    });
  });
  return { positions, canvasHeight };
};

const getRelationStyle = (relationship: UmlRelationship) => {
  const name = (relationship.label || relationship.type).toLowerCase();
  if (name.includes('uses')) return { color: '#facc15', labelBackground: '#422006', labelBorder: '#facc15' };
  if (name.includes('manages')) return { color: '#4ade80', labelBackground: '#052e16', labelBorder: '#4ade80' };
  if (name.includes('reads')) return { color: '#c084fc', labelBackground: '#3b0764', labelBorder: '#c084fc' };
  return { color: '#818cf8', labelBackground: '#0f172a', labelBorder: '#475569' };
};

const createOrthogonalPath = (
  source: DOMRect,
  target: DOMRect,
  canvas: DOMRect,
  routeIndex: number,
): { path: string; labelX: number; labelY: number } => {
  const sourceCenter = { x: source.left - canvas.left + source.width / 2, y: source.top - canvas.top + source.height / 2 };
  const targetCenter = { x: target.left - canvas.left + target.width / 2, y: target.top - canvas.top + target.height / 2 };
  const sourcePortOffset = ((routeIndex % 7) - 3) * 5;
  const targetPortOffset = (((routeIndex * 3) % 7) - 3) * 5;
  const isSameLane = Math.abs(targetCenter.x - sourceCenter.x) < 30;
  const leftToRight = isSameLane ? routeIndex % 2 === 0 : targetCenter.x >= sourceCenter.x;
  const start = {
    x: sourceCenter.x + (leftToRight ? source.width / 2 : -source.width / 2),
    y: sourceCenter.y + sourcePortOffset,
  };
  const end = {
    x: targetCenter.x + (leftToRight ? -target.width / 2 : target.width / 2),
    y: targetCenter.y + targetPortOffset,
  };
  // Keep the vertical segment in a dedicated gutter beside the source. This
  // avoids routing through the centre of other node lanes and gives labels a
  // stable, unambiguous home beside their line.
  const horizontalDirection = leftToRight ? 1 : -1;
  const requestedLaneDistance = 44 + (routeIndex % 7) * 20;
  const availableLaneDistance = Math.max(28, Math.abs(end.x - start.x) / 2 - 14);
  const midX = start.x + horizontalDirection * Math.min(requestedLaneDistance, availableLaneDistance);
  const verticalDirection = end.y >= start.y ? 1 : -1;
  const radius = Math.min(12, Math.abs(end.y - start.y) / 2, Math.abs(end.x - start.x) / 4);
  const beforeTurn = midX - horizontalDirection * radius;
  const afterTurn = midX + horizontalDirection * radius;

  return {
    path: [
      `M ${start.x} ${start.y}`,
      `H ${beforeTurn}`,
      `Q ${midX} ${start.y} ${midX} ${start.y + verticalDirection * radius}`,
      `V ${end.y - verticalDirection * radius}`,
      `Q ${midX} ${end.y} ${afterTurn} ${end.y}`,
      `H ${end.x}`,
    ].join(' '),
    labelX: midX + horizontalDirection * 5,
    labelY: (start.y + end.y) / 2 - 7,
  };
};

export const WebArchitectureDiagram: React.FC<WebArchitectureDiagramProps> = ({
  classes,
  relationships,
  repoFullName,
  defaultBranch,
}) => {
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef(new Map<string, HTMLAnchorElement>());
  const { positions, canvasHeight } = useMemo(() => getClusteredLayout(classes), [classes]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [canvasSize, setCanvasSize] = useState({ width: 1280, height: canvasHeight });
  const [diagramScale, setDiagramScale] = useState(1);

  useLayoutEffect(() => {
    const updateScale = () => {
      const frame = frameRef.current;
      if (!frame) return;
      const availableHeight = Math.max(380, window.innerHeight * 0.78);
      setDiagramScale(Math.min(1, frame.clientWidth / 1280, availableHeight / canvasHeight));
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    if (frameRef.current) observer.observe(frameRef.current);
    window.addEventListener('resize', updateScale);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateScale);
    };
  }, [canvasHeight]);

  useLayoutEffect(() => {
    const updateConnections = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const canvasRect = canvas.getBoundingClientRect();
      const scale = canvasRect.width / canvas.offsetWidth || 1;
      const toLogicalRect = (rect: DOMRect) => new DOMRect(
        (rect.left - canvasRect.left) / scale,
        (rect.top - canvasRect.top) / scale,
        rect.width / scale,
        rect.height / scale,
      );
      const logicalCanvas = new DOMRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
      setCanvasSize({ width: canvas.offsetWidth, height: canvas.offsetHeight });
      setConnections(relationships.flatMap((relationship, index) => {
        const from = nodeRefs.current.get(relationship.fromId);
        const to = nodeRefs.current.get(relationship.toId);
        if (!from || !to) return [];
        const route = createOrthogonalPath(
          toLogicalRect(from.getBoundingClientRect()),
          toLogicalRect(to.getBoundingClientRect()),
          logicalCanvas,
          index,
        );
        return [{
          id: relationship.id,
          ...route,
          label: relationship.label || relationship.type,
          dashed: relationship.type === 'dependency' || relationship.type === 'realization',
          ...getRelationStyle(relationship),
        }];
      }));
    };

    updateConnections();
    const observer = new ResizeObserver(updateConnections);
    if (canvasRef.current) observer.observe(canvasRef.current);
    return () => observer.disconnect();
  }, [canvasHeight, diagramScale, positions, relationships]);

  return (
    <div className="rounded-lg border border-slate-700/70 bg-slate-950/70 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-800 text-[10px] text-slate-400">
        <GitBranch className="w-3.5 h-3.5 text-indigo-400" />
        <span>Related modules are clustered together; labelled connectors match the UML relationships.</span>
      </div>
      <div ref={frameRef} className="w-full overflow-hidden" style={{ height: canvasHeight * diagramScale }}>
      <div
        ref={canvasRef}
        className="relative w-[1280px]"
        style={{ height: canvasHeight, transform: `scale(${diagramScale})`, transformOrigin: 'top left' }}
      >
        <div className="absolute inset-x-0 top-2 grid grid-cols-4 px-4 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-600">
          {GROUPS.map((group) => <span key={group.name}>{group.name}</span>)}
        </div>
        <svg className="absolute inset-0 pointer-events-none" width={canvasSize.width} height={canvasSize.height} aria-hidden="true">
          <defs>
            <marker id="architecture-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L6,3 z" fill="context-stroke" />
            </marker>
          </defs>
          {connections.map((connection) => (
            <g key={connection.id}>
              <path d={connection.path} fill="none" stroke="#020617" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
              <path d={connection.path} fill="none" stroke={connection.color} strokeWidth="1.5" strokeDasharray={connection.dashed ? '5 4' : undefined}
                strokeLinecap="round" strokeLinejoin="round" opacity="0.8" markerEnd="url(#architecture-arrow)" />
              <rect
                x={connection.labelX - (connection.label.length * 2.9 + 5)}
                y={connection.labelY - 7}
                width={connection.label.length * 5.8 + 10}
                height="14"
                rx="4"
                fill={connection.labelBackground}
                stroke={connection.labelBorder}
              />
              <text x={connection.labelX} y={connection.labelY} textAnchor="middle" dominantBaseline="middle" className="fill-slate-100 text-[9px]">
                {connection.label}
              </text>
            </g>
          ))}
        </svg>

        {classes.map((umlClass) => {
          const position = positions[umlClass.id];
          const memberCount = umlClass.attributes.length + umlClass.methods.length;
          return (
            <a
              key={umlClass.id}
              ref={(element) => { if (element) nodeRefs.current.set(umlClass.id, element); else nodeRefs.current.delete(umlClass.id); }}
              href={`https://github.com/${repoFullName}/search?q=${encodeURIComponent(umlClass.name)}&type=code`}
              target="_blank"
              rel="noopener noreferrer"
              title={`Find ${umlClass.name} in this repository on GitHub`}
              className="absolute z-10 w-52 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-indigo-400/30 bg-slate-900/95 shadow-md shadow-black/20 transition hover:z-20 hover:border-indigo-400/70 hover:bg-slate-800"
              style={{ left: `${position.x * 100}%`, top: `${position.y}px` }}
            >
              <p className="px-2.5 pt-2 text-[9px] uppercase tracking-wider text-indigo-300">«{umlClass.stereotype || 'class'}»</p>
              <div className="mt-1 flex items-center gap-1.5 border-y border-slate-700/80 px-2.5 py-1.5">
                <span className="truncate text-xs font-bold text-indigo-100">{umlClass.name}</span>
                <ExternalLink className="w-3 h-3 shrink-0 text-slate-500" />
              </div>
              {memberCount > 0 && (
                <div className="space-y-0.5 px-2.5 py-2 font-mono text-[9px] leading-[1.35] text-slate-300">
                  {umlClass.attributes.map((attribute) => <p key={`attribute-${attribute.name}`} className="break-words">{memberText(attribute)}</p>)}
                  {umlClass.methods.map((method) => <p key={`method-${method.name}`} className="break-words">{memberText(method, true)}</p>)}
                </div>
              )}
            </a>
          );
        })}
      </div>
      </div>
    </div>
  );
};
