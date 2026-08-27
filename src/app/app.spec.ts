import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('creates the transformer', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('transforms JSON with a JMESPath query', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const source = element.querySelector<HTMLTextAreaElement>('#source');
    const query = element.querySelector<HTMLTextAreaElement>('#query');
    const runButton = element.querySelector<HTMLButtonElement>('.run-button');

    expect(source).not.toBeNull();
    expect(query).not.toBeNull();
    expect(runButton).not.toBeNull();

    source!.value = '{"people":[{"name":"Ada","age":36},{"name":"Grace","age":28}]}';
    source!.dispatchEvent(new Event('input'));
    query!.value = 'people[?age > `30`].name';
    query!.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    runButton!.click();
    fixture.detectChanges();

    const result = element.querySelector<HTMLTextAreaElement>('#result');
    expect(result?.value).toBe('[\n  "Ada"\n]');
    expect(element.querySelector('.status.success')?.textContent).toContain(
      'Query completed successfully.',
    );
  });
});
