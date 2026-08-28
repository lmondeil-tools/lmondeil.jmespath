import { Component, computed, input, signal } from '@angular/core';

type NodeKind = 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null' | 'empty';

interface TreeRow {
  id: string;
  path: string;
  type: 'open' | 'close' | 'value';
  kind: NodeKind;
  depth: number;
  key: string | null;
  text: string;
  count: number;
  collapsed: boolean;
  isLast: boolean;
}

@Component({
  selector: 'app-json-tree',
  styleUrl: './json-tree.css',
  templateUrl: './json-tree.html',
})
export class JsonTree {
  readonly value = input<unknown>(undefined);

  private readonly collapsedPaths = signal<ReadonlySet<string>>(new Set<string>());

  protected readonly rows = computed<TreeRow[]>(() => {
    const rows: TreeRow[] = [];
    this.buildRows(this.value(), null, 0, '$', true, this.collapsedPaths(), rows);
    return rows;
  });

  protected toggle(path: string): void {
    const next = new Set(this.collapsedPaths());
    if (!next.delete(path)) {
      next.add(path);
    }
    this.collapsedPaths.set(next);
  }

  protected expandAll(): void {
    this.collapsedPaths.set(new Set<string>());
  }

  protected collapseAll(): void {
    const paths = new Set<string>();
    this.collectContainerPaths(this.value(), '$', paths);
    this.collapsedPaths.set(paths);
  }

  private collectContainerPaths(value: unknown, path: string, out: Set<string>): void {
    const entries = this.entriesOf(value);
    if (!entries || entries.length === 0) {
      return;
    }

    out.add(path);
    for (const [key, child] of entries) {
      this.collectContainerPaths(child, `${path}/${key}`, out);
    }
  }

  private buildRows(
    value: unknown,
    key: string | null,
    depth: number,
    path: string,
    isLast: boolean,
    collapsed: ReadonlySet<string>,
    out: TreeRow[],
  ): void {
    const entries = this.entriesOf(value);

    if (!entries) {
      out.push({
        id: `${path}:value`,
        path,
        type: 'value',
        kind: this.scalarKind(value),
        depth,
        key,
        text: this.formatScalar(value),
        count: 0,
        collapsed: false,
        isLast,
      });
      return;
    }

    const kind: NodeKind = Array.isArray(value) ? 'array' : 'object';

    if (entries.length === 0) {
      out.push({
        id: `${path}:value`,
        path,
        type: 'value',
        kind: 'empty',
        depth,
        key,
        text: kind === 'array' ? '[]' : '{}',
        count: 0,
        collapsed: false,
        isLast,
      });
      return;
    }

    const isCollapsed = collapsed.has(path);

    out.push({
      id: `${path}:open`,
      path,
      type: 'open',
      kind,
      depth,
      key,
      text: '',
      count: entries.length,
      collapsed: isCollapsed,
      isLast,
    });

    if (isCollapsed) {
      return;
    }

    entries.forEach(([childKey, childValue], index) => {
      this.buildRows(
        childValue,
        kind === 'array' ? null : childKey,
        depth + 1,
        `${path}/${childKey}`,
        index === entries.length - 1,
        collapsed,
        out,
      );
    });

    out.push({
      id: `${path}:close`,
      path,
      type: 'close',
      kind,
      depth,
      key,
      text: '',
      count: entries.length,
      collapsed: false,
      isLast,
    });
  }

  private entriesOf(value: unknown): [string, unknown][] | null {
    if (Array.isArray(value)) {
      return value.map((item, index) => [String(index), item] as [string, unknown]);
    }

    if (value !== null && typeof value === 'object') {
      return Object.entries(value as Record<string, unknown>);
    }

    return null;
  }

  private scalarKind(value: unknown): NodeKind {
    if (value === null || value === undefined) {
      return 'null';
    }

    const type = typeof value;
    return type === 'string' || type === 'number' || type === 'boolean' ? type : 'string';
  }

  private formatScalar(value: unknown): string {
    if (value === undefined) {
      return 'null';
    }

    return JSON.stringify(value) ?? 'null';
  }
}
