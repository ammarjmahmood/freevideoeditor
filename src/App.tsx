import { useState, useRef, useEffect } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { 
  Upload, Scissors, Play, Download, Layers, Zap, Maximize2, RefreshCw, Type, Music, Settings
} from 'lucide-react';

function App() {
  const [loaded, setLoaded] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isProcessing] = useState(false);
  const [progress] = useState(0);
  const [transcribing, setTranscribing] = useState(false);
  const [captions, setCaptions] = useState<any[]>([]);
  const [status, setStatus] = useState('');
  
  const [layers, setLayers] = useState<any[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [timelineZoom, setTimelineZoom] = useState(10); 
  const [currentTime] = useState(0);

  const ffmpegRef = useRef(new FFmpeg());
  const videoRef = useRef<HTMLVideoElement>(null);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    load();
    workerRef.current = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    workerRef.current.onmessage = (e) => {
      const { status: msgStatus, output, progress: transcriptionProgress } = e.data;
      if (msgStatus === 'progress') {
        setStatus(`Loading Model: ${Math.round(transcriptionProgress * 100)}%`);
      } else if (msgStatus === 'complete') {
        setCaptions(output.chunks);
        setTranscribing(false);
        setStatus('Auto-captions generated!');
      } else if (msgStatus === 'error') {
        setStatus(`Transcription error: ${e.data.error}`);
        setTranscribing(false);
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const load = async () => {
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    const ffmpeg = ffmpegRef.current;
    
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    setLoaded(true);
  };

  const generateAutoCaptions = async () => {
    if (!videoFile || transcribing) return;
    setTranscribing(true);
    setStatus('Extracting audio for transcription...');
    
    const ffmpeg = ffmpegRef.current;
    try {
      await ffmpeg.writeFile('input.mp4', await fetchFile(videoFile));
      await ffmpeg.exec(['-i', 'input.mp4', '-ar', '16000', '-ac', '1', 'audio.wav']);
      const audioData = await ffmpeg.readFile('audio.wav');
      
      const audioContext = new AudioContext();
      // Fix for SharedArrayBuffer issue
      const buffer = (audioData as Uint8Array).buffer.slice(0);
      const decoded = await audioContext.decodeAudioData(buffer as any);
      const float32Audio = decoded.getChannelData(0);
      
      setStatus('Transcribing audio locally...');
      workerRef.current?.postMessage({ audio: float32Audio, language: 'english' });
    } catch (err) {
      console.error(err);
      setStatus('Transcription failed.');
      setTranscribing(false);
    }
  };

  const addLayer = (file: File, type: 'video' | 'image') => {
    if (type === 'video') {
       setVideoFile(file);
       setVideoUrl(URL.createObjectURL(file));
    }
    const newLayer = {
      id: Math.random().toString(36).substring(2, 9),
      type,
      file,
      url: URL.createObjectURL(file),
      start: 0,
      duration: type === 'video' ? 10 : 5,
      x: 0,
      y: 0,
      scale: 0.5,
      z: layers.length + 1
    };
    setLayers([...layers, newLayer]);
    setSelectedLayerId(newLayer.id);
  };

  const splitClip = () => {
    const layer = layers.find(l => l.id === selectedLayerId);
    if (!layer || layer.type !== 'video') return;
    
    const firstHalf = { ...layer, id: layer.id + '_1', duration: currentTime - layer.start };
    const secondHalf = { ...layer, id: layer.id + '_2', start: currentTime, duration: layer.duration - (currentTime - layer.start) };
    
    setLayers(layers.filter(l => l.id !== selectedLayerId).concat([firstHalf, secondHalf]));
  };

  const deleteLayer = (id: string) => {
    setLayers(layers.filter(l => l.id !== id));
    if (selectedLayerId === id) setSelectedLayerId(null);
  };

  const downloadVideo = () => {
    const url = videoUrl || (layers.length > 0 ? layers[0].url : null);
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = 'edited_video.mp4';
    a.click();
  };

  return (
    <div className="min-h-screen bg-[#121212] text-white flex flex-col font-sans">
      <nav className="border-b border-white/10 p-4 flex justify-between items-center bg-[#1a1a1a]">
        <div className="flex items-center gap-3">
          <div className="bg-yellow-400 p-1.5 rounded-lg">
            <Zap className="text-black" size={20} fill="black" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight leading-none">Free Video Editor</h1>
            <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mt-1">No Signup • No Save • 100% Local</p>
          </div>
        </div>
        <div className="flex gap-4 items-center">
          <div className="hidden md:flex items-center gap-2 bg-green-500/10 text-green-500 px-3 py-1 rounded-full text-xs font-bold border border-green-500/20">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Private Local Processing
          </div>
          <button 
            onClick={downloadVideo}
            disabled={layers.length === 0 || isProcessing}
            className="flex items-center gap-2 bg-yellow-400 text-black px-5 py-2 rounded-full font-bold hover:bg-yellow-300 transition-all shadow-lg shadow-yellow-400/10 disabled:opacity-50 disabled:shadow-none"
          >
            <Download size={18} /> Export
          </button>
        </div>
      </nav>

      <main className="flex-1 flex overflow-hidden">
        <aside className="w-16 border-r border-white/10 bg-[#1a1a1a] flex flex-col items-center py-6 gap-8">
          <div className="relative group">
            <button 
              onClick={() => document.getElementById('overlay-upload')?.click()}
              className="p-3 rounded-xl hover:bg-white/5 text-yellow-400" 
              title="Add Watermark/Overlay"
            >
              <Layers size={24} />
            </button>
            <input 
              id="overlay-upload" 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) addLayer(file, 'image');
              }}
            />
          </div>
          <button 
            onClick={() => {}}
            className="p-3 rounded-xl hover:bg-white/5 text-gray-400 hover:text-yellow-400" 
            title="Crop (Coming Soon)"
          >
            <Maximize2 size={24} />
          </button>
          <button 
            onClick={generateAutoCaptions}
            className="p-3 rounded-xl hover:bg-white/5 text-gray-400 hover:text-yellow-400" 
            title="Auto-Captions"
          >
            <Type size={24} />
          </button>
          <button className="p-3 rounded-xl hover:bg-white/5 text-gray-400" title="Music (Coming Soon)">
            <Music size={24} />
          </button>
          <button className="p-3 rounded-xl hover:bg-white/5 text-gray-400" title="Cut (Coming Soon)">
            <Scissors size={24} />
          </button>
        </aside>

        <section className="flex-1 flex flex-col bg-[#0a0a0a] relative">
          {layers.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12">
              <div className="w-full max-w-xl border-2 border-dashed border-white/20 rounded-3xl p-12 flex flex-col items-center gap-6 hover:border-yellow-400/50 transition-colors cursor-pointer group relative">
                <input 
                  type="file" 
                  accept="video/*,image/*" 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) addLayer(file, file.type.startsWith('video') ? 'video' : 'image');
                  }} 
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <div className="bg-white/5 p-6 rounded-full group-hover:bg-yellow-400/10 transition-colors">
                  <Upload size={48} className="text-gray-400 group-hover:text-yellow-400" />
                </div>
                <div className="text-center">
                  <h2 className="text-2xl font-bold mb-2">Drop media to start</h2>
                  <p className="text-gray-400">Multiple videos, images, and boxes</p>
                </div>
                {!loaded && (
                  <div className="mt-4 flex items-center gap-2 text-yellow-400">
                    <RefreshCw className="animate-spin" size={18} />
                    <span>Initializing Engine...</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col p-8 gap-6 relative">
              <div 
                className="flex-1 bg-black rounded-2xl overflow-hidden shadow-2xl relative border border-white/5 flex items-center justify-center"
                style={{ 
                   backgroundImage: 'radial-gradient(circle, #333 1px, transparent 1px)', 
                   backgroundSize: '20px 20px' 
                }}
              >
                <div className="relative aspect-video bg-black w-[80%] shadow-2xl overflow-hidden group">
                   {layers.map(layer => (
                     <div 
                        key={layer.id}
                        onClick={(e) => { e.stopPropagation(); setSelectedLayerId(layer.id); }}
                        className={`absolute cursor-move transition-shadow ${selectedLayerId === layer.id ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-black' : ''}`}
                        style={{ 
                          top: `${layer.y}px`, 
                          left: `${layer.x}px`, 
                          zIndex: layer.z,
                          transform: `scale(${layer.scale})`,
                          transformOrigin: 'top left'
                        }}
                     >
                        {layer.type === 'video' ? (
                           <video src={layer.url} className="pointer-events-none max-w-none" width="100%" />
                        ) : (
                           <img src={layer.url} className="pointer-events-none max-w-none" alt="" />
                        )}
                        
                        {selectedLayerId === layer.id && (
                           <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full cursor-nwse-resize border-4 border-black shadow-lg" />
                        )}
                     </div>
                   ))}

                  <div className="absolute bottom-10 left-0 right-0 flex justify-center pointer-events-none">
                     {captions.length > 0 && videoRef.current && (
                       <CaptionOverlay video={videoRef.current} captions={captions} />
                     )}
                  </div>
                </div>

                <div className="absolute top-4 right-4 flex bg-black/50 backdrop-blur p-2 rounded-lg gap-4">
                   <button onClick={() => setTimelineZoom(z => z * 1.2)} title="Zoom In Timeline"><Maximize2 size={16} /></button>
                </div>

                {isProcessing && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-50 backdrop-blur-sm">
                    <div className="w-64 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-yellow-400 transition-all duration-300" 
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="mt-4 text-yellow-400 font-medium">{status}</p>
                  </div>
                )}
              </div>

              <div className="bg-[#1a1a1a] p-4 rounded-2xl border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <button 
                     onClick={splitClip}
                     className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-lg text-gray-300 hover:bg-yellow-400/20 hover:text-yellow-400 transition-all font-semibold"
                   >
                     <Scissors size={18} /> Split
                   </button>
                   <button 
                     onClick={() => selectedLayerId && deleteLayer(selectedLayerId)}
                     className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-lg text-gray-300 hover:bg-red-500/20 hover:text-red-500 transition-all"
                   >
                     <Settings size={18} /> Delete Layer
                   </button>
                </div>
                
                <div className="text-sm text-gray-500 font-mono italic">
                  {status}
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      <footer className="h-64 border-t border-white/10 bg-[#1a1a1a] flex flex-col">
        <div className="flex items-center justify-between p-2 border-b border-white/5 bg-[#161616]">
          <div className="flex items-center gap-4">
             <Play size={16} className="text-yellow-400 fill-yellow-400" />
             <div className="text-sm font-mono text-gray-400">00:{currentTime.toFixed(2)} / 00:10.00</div>
          </div>
          <div className="flex gap-4 items-center">
             <div className="flex bg-black rounded p-1">
                <button onClick={() => setTimelineZoom(z => Math.max(z/1.2, 2))} className="px-2 text-gray-500 hover:text-white">-</button>
                <div className="w-[1px] bg-white/10 mx-1" />
                <button onClick={() => setTimelineZoom(z => z * 1.2)} className="px-2 text-gray-500 hover:text-white">+</button>
             </div>
          </div>
        </div>

        <div className="flex-1 overflow-x-auto relative bg-[#0f0f0f] timeline-scroll custom-scrollbar">
           <div className="h-6 border-b border-white/5 relative bg-[#121212]" style={{ width: `${10 * timelineZoom * 10}px` }}>
              {Array.from({ length: 100 }).map((_, i) => (
                <div key={i} className="absolute border-l border-white/10 h-full text-[8px] text-gray-600 pl-1" style={{ left: `${i * timelineZoom}px` }}>
                  {i}s
                </div>
              ))}
           </div>

           <div className="p-2 space-y-2 relative" style={{ width: `${10 * timelineZoom * 10}px` }}>
              {layers.map((layer) => (
                <div key={layer.id} className="h-10 relative flex items-center">
                   <div 
                     className={`absolute h-8 rounded border transition-all cursor-move overflow-hidden flex items-center px-2 text-[10px] font-bold ${
                        selectedLayerId === layer.id 
                        ? 'bg-yellow-400/30 border-yellow-400 text-yellow-400' 
                        : 'bg-white/5 border-white/10 text-gray-400'
                     }`}
                     style={{ 
                        left: `${layer.start * timelineZoom}px`, 
                        width: `${layer.duration * timelineZoom}px` 
                     }}
                     onClick={() => setSelectedLayerId(layer.id)}
                   >
                     {layer.type === 'video' ? <Scissors size={10} className="mr-1" /> : <Layers size={10} className="mr-1" />}
                     {layer.file?.name}
                   </div>
                </div>
              ))}
              
              <div 
                className="absolute top-0 bottom-0 w-[2px] bg-yellow-400 z-50 pointer-events-none"
                style={{ left: `${currentTime * timelineZoom}px` }}
              >
                <div className="absolute -top-1 -left-[5px] w-3 h-3 bg-yellow-400 rotate-45" />
              </div>
           </div>
        </div>
      </footer>
    </div>
  );
}

function CaptionOverlay({ video, captions }: { video: HTMLVideoElement, captions: any[] }) {
  const [currentText, setCurrentText] = useState('');

  useEffect(() => {
    const update = () => {
      const time = video.currentTime;
      const current = captions.find(c => time >= c.timestamp[0] && time <= c.timestamp[1]);
      setCurrentText(current ? current.text : '');
    };
    video.addEventListener('timeupdate', update);
    return () => video.removeEventListener('timeupdate', update);
  }, [video, captions]);

  if (!currentText) return null;

  return (
    <div className="bg-black/70 text-white px-4 py-2 rounded-lg text-lg font-bold shadow-xl border border-white/10 max-w-[80%] text-center backdrop-blur-md">
      {currentText}
    </div>
  );
}

export default App;
