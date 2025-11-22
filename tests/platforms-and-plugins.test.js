import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
vi.mock('../src/utils/http.js', () => {
    return {
        request: vi.fn(),
        requestJson: vi.fn(),
        requestBuffer: vi.fn(),
    };
});
const { request, requestJson, requestBuffer } = await import('../src/utils/http.js');
const originalEnv = { ...process.env };
beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
});
afterAll(() => {
    process.env = originalEnv;
});
describe('GoogleScholarAdapter', () => {
    it('parses search results from HTML', async () => {
        const html = `
      <div class="gs_ri">
        <h3 class="gs_rt"><a href="https://example.com/paper.pdf">[PDF] Sample Paper</a></h3>
        <div class="gs_a">Alice, Bob - 2024 - Journal</div>
        <div class="gs_rs">An abstract snippet.</div>
      </div>
    `;
        request.mockResolvedValue({ body: html });
        const { GoogleScholarAdapter } = await import('../src/platforms/googleScholar.js');
        const adapter = new GoogleScholarAdapter();
        const result = await adapter.search({ text: 'test', limit: 1 });
        expect(result.items).toHaveLength(1);
        expect(result.items[0].title).toContain('Sample Paper');
        expect(result.items[0].authors).toEqual(['Alice', 'Bob']);
        expect(result.items[0].pdfUrl).toContain('paper.pdf');
    });
});
describe('SemanticAdapter', () => {
    it('returns normalized papers from API', async () => {
        requestJson.mockResolvedValue({
            data: [
                {
                    paperId: 'pid',
                    title: 'Semantic Result',
                    abstract: 'Details',
                    year: 2023,
                    citationCount: 10,
                    influentialCitationCount: 2,
                    publicationDate: '2023-05-14',
                    authors: [{ name: 'Alice' }],
                    externalIds: { DOI: '10.1000/xyz' },
                    fieldsOfStudy: ['CS'],
                    tldr: { text: 'tl;dr' },
                    openAccessPdf: { url: 'https://example.com/paper.pdf' },
                },
            ],
        });
        const { SemanticAdapter } = await import('../src/platforms/semantic.js');
        const adapter = new SemanticAdapter();
        const result = await adapter.search({ text: 'semantic', limit: 1 });
        expect(result.items[0].doi).toBe('10.1000/xyz');
        expect(result.items[0].pdfUrl).toContain('paper.pdf');
        expect(result.items[0].extra?.tldr).toBe('tl;dr');
    });
});
describe('IacrAdapter', () => {
    it('parses search results and details', async () => {
        const searchHtml = `
      <div class="mb-4">
        <div class="d-flex">
          <a class="paperlink" href="/2024/123">2024/123</a>
        </div>
        <div class="ms-md-4">
          <strong>Test Title</strong>
          <span class="fst-italic">Alice, Bob</span>
          <p class="search-abstract">Summary</p>
        </div>
      </div>
    `;
        const detailHtml = `
      <h3 class="mb-3">Detailed Paper</h3>
      <p class="fst-italic">Alice and Bob</p>
      <p style="white-space: pre-wrap;">Detailed abstract</p>
      <div class="card">History<li>2024-01-01: submitted</li></div>
    `;
        request
            .mockResolvedValueOnce({ body: searchHtml })
            .mockResolvedValueOnce({ body: detailHtml });
        const { IacrAdapter } = await import('../src/platforms/iacr.js');
        const adapter = new IacrAdapter();
        const result = await adapter.search({ text: 'crypto', limit: 1 });
        expect(result.items).toHaveLength(1);
        expect(result.items[0].title).toBe('Detailed Paper');
        expect(result.items[0].pdfUrl).toContain('2024/123');
    });
});
describe('SciHubAdapter plugin', () => {
    it('returns parsed paper metadata via search', async () => {
        process.env.SCIHUB_BASE_URL = 'https://sci-hub.test';
        const pageHtml = `
      <html>
        <div id="citation"><i>Example</i> Alice, Bob. <button onclick="clip('10.1/abc')"></button></div>
        <iframe src="//sci-hub.test/download.pdf"></iframe>
      </html>
    `;
        request.mockResolvedValue({ body: pageHtml });
        const { SciHubAdapter } = await import('../src/plugins/sciHub.js');
        const adapter = new SciHubAdapter();
        const result = await adapter.search({ text: '10.1/abc', limit: 1 });
        expect(result.items[0].pdfUrl).toContain('download.pdf');
    });
});
describe('LibgenAdapter plugin', () => {
    it('parses catalog rows', async () => {
        const html = `
      <table class="catalog">
        <tr><th>h</th></tr>
        <tr>
          <td>1</td>
          <td>10.1/lib</td>
          <td>Lib Title</td>
          <td>Alice, Bob</td>
          <td>2022</td>
          <td><a href="/download/123">download</a></td>
        </tr>
      </table>
    `;
        request.mockResolvedValue({ body: html });
        const { LibgenAdapter } = await import('../src/plugins/libgen.js');
        const adapter = new LibgenAdapter();
        const result = await adapter.search({ text: 'lib title', limit: 1 });
        expect(result.items[0].title).toBe('Lib Title');
        expect(result.items[0].pdfUrl).toContain('/download/123');
    });
});
describe('OAButtonAdapter plugin', () => {
    it('maps API payload to paper', async () => {
        requestJson.mockResolvedValue({
            data: [
                {
                    title: 'Open Access Result',
                    doi: '10.1/oa',
                    url: 'https://example.com',
                    authors: [{ name: 'Alice' }],
                    best_oa_location: { url_for_pdf: 'https://example.com/file.pdf' },
                },
            ],
        });
        const { OAButtonAdapter } = await import('../src/plugins/oaButton.js');
        const adapter = new OAButtonAdapter();
        const result = await adapter.search({ text: '10.1/oa', limit: 1 });
        expect(result.items[0].pdfUrl).toContain('file.pdf');
    });
});
describe('UnpaywallAdapter plugin', () => {
    it('requires email and returns paper metadata', async () => {
        process.env.UNPAYWALL_EMAIL = 'tester@example.com';
        requestJson.mockResolvedValue({
            doi: '10.1/up',
            title: 'OA Paper',
            best_oa_location: { url_for_pdf: 'https://example.com/oa.pdf' },
        });
        const { UnpaywallAdapter } = await import('../src/plugins/unpaywall.js');
        const adapter = new UnpaywallAdapter();
        const result = await adapter.search({ text: '10.1/up', limit: 1 });
        expect(result.items[0].pdfUrl).toContain('oa.pdf');
    });
});
