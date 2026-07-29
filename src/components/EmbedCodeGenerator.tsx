import { useState } from 'react';

interface EmbedCodeGeneratorProps {
  onClose?: () => void;
  defaultType?: 'standings' | 'matches' | 'top-scorers';
}

export const EmbedCodeGenerator = ({ onClose, defaultType = 'standings' }: EmbedCodeGeneratorProps) => {
  const [embedType, setEmbedType] = useState<'standings' | 'matches' | 'top-scorers'>(defaultType);
  const [width, setWidth] = useState('100%');
  const [height, setHeight] = useState('600px');
  const [codeType, setCodeType] = useState<'iframe' | 'script'>('iframe');

  const getEmbedUrl = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/embed/${embedType}`;
  };

  const getIframeCode = () => {
    return `<iframe src="${getEmbedUrl()}" width="${width}" height="${height}" frameborder="0" scrolling="auto"></iframe>`;
  };

  const getScriptCode = () => {
    return `<script src="${getEmbedUrl()}/widget.js" data-width="${width}" data-height="${height}"></script>
<div id="abran-cancha-${embedType}"></div>`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Código copiado al portapapeles');
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Generador de Código de Incrustación</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Componente a incrustar</label>
          <select
            value={embedType}
            onChange={(e) => setEmbedType(e.target.value as any)}
            className="w-full p-2 border rounded-md"
          >
            <option value="standings">Tabla de Posiciones</option>
            <option value="matches">Partidos</option>
            <option value="top-scorers">Goleadoras</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Ancho</label>
            <input
              type="text"
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              className="w-full p-2 border rounded-md"
              placeholder="100%"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Alto</label>
            <input
              type="text"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              className="w-full p-2 border rounded-md"
              placeholder="600px"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Tipo de código</label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="iframe"
                checked={codeType === 'iframe'}
                onChange={(e) => setCodeType(e.target.value as any)}
                className="mr-2"
              />
              iframe
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="script"
                checked={codeType === 'script'}
                onChange={(e) => setCodeType(e.target.value as any)}
                className="mr-2"
              />
              script
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Código generado</label>
          <textarea
            readOnly
            value={codeType === 'iframe' ? getIframeCode() : getScriptCode()}
            className="w-full p-2 border rounded-md font-mono text-sm bg-gray-50"
            rows={6}
          />
        </div>

        <button
          onClick={() => copyToClipboard(codeType === 'iframe' ? getIframeCode() : getScriptCode())}
          className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600"
        >
          Copiar código
        </button>

        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
          <p className="font-medium mb-2">Instrucciones:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Selecciona el componente que deseas incrustar</li>
            <li>Ajusta el ancho y alto según tus necesidades</li>
            <li>Copia el código generado</li>
            <li>Pégalo en tu sitio web</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default EmbedCodeGenerator;
