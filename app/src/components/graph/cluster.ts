// Lightweight clustering: greedy modularity / connected components.
// (A full Louvain implementation would be overkill at our edge counts.)

export interface GNode {
  id: string;
  size: number;
  group?: number;
}
export interface GLink {
  source: string;
  target: string;
  weight: number;
}

export function clusterGraph(nodes: GNode[], links: GLink[]): GNode[] {
  const adjacency = new Map<string, Set<string>>();
  nodes.forEach((n) => adjacency.set(n.id, new Set()));
  links.forEach((l) => {
    adjacency.get(l.source)?.add(l.target);
    adjacency.get(l.target)?.add(l.source);
  });

  const groupOf = new Map<string, number>();
  let nextGroup = 0;
  for (const n of nodes) {
    if (groupOf.has(n.id)) continue;
    const stack = [n.id];
    while (stack.length) {
      const cur = stack.pop()!;
      if (groupOf.has(cur)) continue;
      groupOf.set(cur, nextGroup);
      adjacency.get(cur)?.forEach((nb) => {
        if (!groupOf.has(nb)) stack.push(nb);
      });
    }
    nextGroup += 1;
  }

  return nodes.map((n) => ({ ...n, group: groupOf.get(n.id) ?? 0 }));
}

export function shortestPath(
  nodes: GNode[],
  links: GLink[],
  from: string,
  to: string
): string[] | null {
  const adj = new Map<string, string[]>();
  nodes.forEach((n) => adj.set(n.id, []));
  links.forEach((l) => {
    adj.get(l.source)?.push(l.target);
    adj.get(l.target)?.push(l.source);
  });
  const queue: string[][] = [[from]];
  const seen = new Set<string>([from]);
  while (queue.length) {
    const path = queue.shift()!;
    const cur = path[path.length - 1];
    if (cur === to) return path;
    for (const nb of adj.get(cur) ?? []) {
      if (!seen.has(nb)) {
        seen.add(nb);
        queue.push([...path, nb]);
      }
    }
  }
  return null;
}
