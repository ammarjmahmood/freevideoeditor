import { pipeline, env, type AutomaticSpeechRecognitionPipeline } from '@xenova/transformers';

// Skip local check to download from the web (easier for prototype)
env.allowLocalModels = false;

class TranscriptionWorker {
    static pipelineInstance: AutomaticSpeechRecognitionPipeline | null = null;

    static async getInstance(progress_callback?: (progress: any) => void): Promise<AutomaticSpeechRecognitionPipeline> {
        if (this.pipelineInstance === null) {
            this.pipelineInstance = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny', { progress_callback }) as AutomaticSpeechRecognitionPipeline;
        }
        return this.pipelineInstance;
    }
}

self.onmessage = async (event: MessageEvent) => {
    const { audio, language } = event.data;

    try {
        const transcriber = await TranscriptionWorker.getInstance((p) => {
            self.postMessage({ status: 'progress', ...p });
        });

        const output = await transcriber(audio, {
            chunk_length_s: 30,
            stride_length_s: 5,
            language: language || 'english',
            task: 'transcribe',
            return_timestamps: true,
        });

        self.postMessage({
            status: 'complete',
            output: output
        });
    } catch (error) {
        self.postMessage({
            status: 'error',
            error: error instanceof Error ? error.message : String(error)
        });
    }
};
