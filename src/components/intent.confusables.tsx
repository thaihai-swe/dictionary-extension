import React from 'react';
import { AiResult } from '../types';
import MarkdownRenderer from './component.markdown-renderer';

interface ConfusablesIntentProps {
  result: AiResult;
  targetLang?: string;
}

export const ConfusablesIntent: React.FC<ConfusablesIntentProps> = ({ result, targetLang }) => {
  return (
    <div className="space-y-4">
      {result.comparison?.rows?.length ? (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-[13px] text-left">
            <thead className="bg-muted text-content font-bold">
              <tr>
                <th className="px-3 py-2 font-bold">Dimension</th>
                <th className="px-3 py-2 font-bold">{result.comparison.leftTerm || 'Term A'}</th>
                <th className="px-3 py-2 font-bold">{result.comparison.rightTerm || 'Term B'}</th>
              </tr>
            </thead>
            <tbody>
              {result.comparison.rows.map((row) => (
                <tr key={row.dimension} className="border-t border-border">
                  <td className="px-3 py-2 text-content-muted font-semibold">{row.dimension}</td>
                  <td className="px-3 py-2 text-content">{row.left}</td>
                  <td className="px-3 py-2 text-content">{row.right}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {result.summary ? (
        <div className="pt-2 border-t border-border/50 space-y-3">
          <MarkdownRenderer content={result.summary} targetLang={targetLang} />
        </div>
      ) : null}
    </div>
  );
};

export default ConfusablesIntent;
