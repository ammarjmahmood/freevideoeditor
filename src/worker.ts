import { pipeline, env } from '@xenova/transformers';

// Skip local check to download from the web (easier for prototype)
env.allowLocalModels = false;

class TranscriptionWorker {
    static instance = null;
    static pipelineInstance = null;

    static async getInstance(progress_callback = null) {
        if (this.pipelineInstance === null) {
            this.pipelineInstance = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny', { progress_callback });
        }
        return this.pipelineInstance;
    }
}

self.onmessage = async (event) => {
    const { audio, language } = event.data;

    const transcriber = await TranscriptionWorker.getInstance((p) => {
        self.postMessage({ status: 'progress', ...p });
    });

    try {
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
            error: error.message
        });
    }
};
