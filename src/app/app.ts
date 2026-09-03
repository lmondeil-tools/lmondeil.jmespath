import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import * as jmespath from 'jmespath';
import { JSONPath } from 'jsonpath-plus';
import { JsonTree } from './json-tree';

type StatusType = 'success' | 'warning' | 'error';
type QueryLanguage = 'jmespath' | 'jsonpath';

interface StatusMessage {
  type: StatusType;
  message: string;
}

interface Token {
  type: 'key' | 'string' | 'number' | 'boolean' | 'null' | 'punc' | 'plain';
  text: string;
}

const TOKEN_PATTERN =
  /("(?:\\.|[^"\\])*"\s*(?=:))|("(?:\\.|[^"\\])*")|\b(true|false)\b|\b(null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|([{}\[\],:])/g;

@Component({
  imports: [FormsModule, JsonTree],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly sourceJson = signal('');
  protected readonly sourceFileName = signal('');
  protected readonly sourceView = signal<'code' | 'tree'>('code');
  protected readonly queryLanguage = signal<QueryLanguage>('jmespath');
  protected readonly query = signal('');
  protected readonly result = signal('');
  protected readonly resultValue = signal<unknown>(undefined);
  protected readonly resultView = signal<'tree' | 'raw'>('tree');
  protected readonly sourceCollapsed = signal(false);
  protected readonly chainCollapsed = signal(true);
  protected readonly chainQuery = signal('');
  protected readonly chainResult = signal('');
  protected readonly chainResultValue = signal<unknown>(undefined);
  protected readonly chainResultView = signal<'tree' | 'raw'>('tree');
  protected readonly status = signal<StatusMessage | null>(null);

  protected readonly sourceTokens = computed<Token[]>(() => this.tokenize(this.sourceJson()));
  protected readonly queryLanguageLabel = computed(() =>
    this.queryLanguage() === 'jmespath' ? 'JMESPath' : 'JSONPath',
  );
  protected readonly queryPlaceholder = computed(() =>
    this.queryLanguage() === 'jmespath' ? 'people[?age > `30`].name' : '$.people[?(@.age > 30)].name',
  );

  protected readonly sourceTree = computed(() => {
    const text = this.sourceJson().trim();

    if (!text) {
      return { ok: false, value: undefined, error: 'Enter source JSON or load a file to browse it as a tree.' };
    }

    try {
      return { ok: true, value: JSON.parse(text) as unknown, error: '' };
    } catch (error: unknown) {
      return { ok: false, value: undefined, error: `The source JSON is invalid: ${this.errorMessage(error)}` };
    }
  });

  protected readonly sourcePlaceholder = `{
  "people": [
    { "name": "Ada", "age": 36 },
    { "name": "Grace", "age": 28 }
  ]
}`;

  protected readonly resultPlaceholder = `[
  "Ada"
]`;

  protected async loadJsonFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    try {
      this.sourceJson.set(await file.text());
      this.sourceFileName.set(file.name);
      this.status.set({ type: 'success', message: `Loaded ${file.name}.` });
    } catch (error: unknown) {
      this.status.set({
        type: 'error',
        message: `Could not read the selected file: ${this.errorMessage(error)}`,
      });
    } finally {
      input.value = '';
    }
  }

  protected runQuery(): void {
    const source = this.sourceJson().trim();
    const expression = this.query().trim();

    if (!source) {
      this.status.set({ type: 'warning', message: 'Enter source JSON or load a JSON file.' });
      return;
    }

    if (!expression) {
      this.status.set({ type: 'warning', message: `Enter a ${this.queryLanguageLabel()} query.` });
      return;
    }

    let parsedSource: unknown;
    try {
      parsedSource = JSON.parse(source) as unknown;
    } catch (error: unknown) {
      this.status.set({
        type: 'error',
        message: `The source JSON is invalid: ${this.errorMessage(error)}`,
      });
      return;
    }

    try {
      const transformed = this.evaluateQuery(parsedSource, expression);
      this.result.set(JSON.stringify(transformed, null, 2) ?? 'null');
      this.resultValue.set(transformed);
      this.clearChainResult();
      this.status.set({ type: 'success', message: 'Query completed successfully.' });
    } catch (error: unknown) {
      this.status.set({
        type: 'error',
        message: `The ${this.queryLanguageLabel()} query could not be evaluated: ${this.errorMessage(error)}`,
      });
    }
  }

  protected runChainQuery(): void {
    const expression = this.chainQuery().trim();

    if (!this.result()) {
      this.status.set({ type: 'warning', message: 'Run a transformation before chaining a query.' });
      return;
    }

    if (!expression) {
      this.status.set({ type: 'warning', message: `Enter a chained ${this.queryLanguageLabel()} query.` });
      return;
    }

    try {
      const transformed = this.evaluateQuery(this.resultValue() ?? null, expression);
      this.chainResult.set(JSON.stringify(transformed, null, 2) ?? 'null');
      this.chainResultValue.set(transformed);
      this.status.set({ type: 'success', message: 'Chained query completed successfully.' });
    } catch (error: unknown) {
      this.status.set({
        type: 'error',
        message: `The chained ${this.queryLanguageLabel()} query could not be evaluated: ${this.errorMessage(error)}`,
      });
    }
  }

  private clearChainResult(): void {
    this.chainResult.set('');
    this.chainResultValue.set(undefined);
  }

  protected setQueryLanguage(language: QueryLanguage): void {
    this.queryLanguage.set(language);
    this.clearChainResult();
  }

  private evaluateQuery(source: unknown, expression: string): unknown {
    return this.queryLanguage() === 'jmespath'
      ? jmespath.search(source, expression)
      : JSONPath({
          json: source as string | number | boolean | object | null,
          path: expression,
          wrap: true,
        });
  }

  protected syncScroll(event: Event, highlight: HTMLElement): void {
    const textarea = event.target as HTMLTextAreaElement;
    highlight.scrollTop = textarea.scrollTop;
    highlight.scrollLeft = textarea.scrollLeft;
  }

  private tokenize(text: string): Token[] {
    const tokens: Token[] = [];
    let lastIndex = 0;

    for (const match of text.matchAll(TOKEN_PATTERN)) {
      const index = match.index ?? 0;
      if (index > lastIndex) {
        tokens.push({ type: 'plain', text: text.slice(lastIndex, index) });
      }

      const [value, key, string, boolean, nullish, number] = match;
      const type: Token['type'] = key
        ? 'key'
        : string
          ? 'string'
          : boolean
            ? 'boolean'
            : nullish
              ? 'null'
              : number
                ? 'number'
                : 'punc';

      tokens.push({ type, text: value });
      lastIndex = index + value.length;
    }

    if (lastIndex < text.length) {
      tokens.push({ type: 'plain', text: text.slice(lastIndex) });
    }

    return tokens;
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
