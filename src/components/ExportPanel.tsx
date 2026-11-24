import { useState } from 'react';

interface ExportPanelProps {
  json: string;
}

export default function ExportPanel({ json }: ExportPanelProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = json;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const download = () => {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'zoning-studio-article.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="panel export-panel">
      <div className="panel-head">
        <div>
          <h2>Export JSON</h2>
          <p className="panel-sub">
            The finished article as data — overall dimensions plus every zone with its computed size and
            position, ready to feed a production or rendering pipeline.
          </p>
        </div>
        <div className="panel-actions">
          <button type="button" className="btn" onClick={copy}>
            {copied ? 'Copied ✓' : 'Copy'}
          </button>
          <button type="button" className="btn btn--primary" onClick={download}>
            Download .json
          </button>
        </div>
      </div>
      <pre className="json-view">{json}</pre>
    </section>
  );
}
