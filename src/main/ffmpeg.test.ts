/**
 * AkiConvert
 * Copyright (c) 2026 Akiro. All rights reserved.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EventEmitter } from 'events'

// Mock child_process
vi.mock('child_process', () => ({
  spawn: vi.fn()
}))

import { spawn } from 'child_process'
import { runFfmpeg, probeDuration, run, extractLyrics, formatFfmpegError } from './ffmpeg'

// Helper to create a mock child process
function createMockProcess(): EventEmitter & { stdout: EventEmitter; stderr: EventEmitter; kill: ReturnType<typeof vi.fn> } {
  const proc = new EventEmitter() as any
  proc.stdout = new EventEmitter()
  proc.stderr = new EventEmitter()
  proc.kill = vi.fn()
  proc.pid = 12345
  return proc
}

describe('runFfmpeg', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should spawn ffmpeg with given args', async () => {
    const mockProc = createMockProcess()
    vi.mocked(spawn).mockReturnValue(mockProc as any)

    const promise = runFfmpeg(['-i', 'input.mp3', 'output.wav'])

    mockProc.emit('close', 0)

    await promise

    expect(spawn).toHaveBeenCalledWith('ffmpeg', ['-i', 'input.mp3', 'output.wav'], expect.any(Object))
  })

  it('should collect stderr output', async () => {
    const mockProc = createMockProcess()
    vi.mocked(spawn).mockReturnValue(mockProc as any)

    const promise = runFfmpeg(['-i', 'input.mp3', 'output.wav'])

    mockProc.stderr.emit('data', Buffer.from('some stderr output'))
    mockProc.emit('close', 0)

    const result = await promise
    expect(result.stderr).toContain('some stderr output')
  })

  it('should reject on non-zero exit code', async () => {
    const mockProc = createMockProcess()
    vi.mocked(spawn).mockReturnValue(mockProc as any)

    const promise = runFfmpeg(['-i', 'input.mp3', 'output.wav'])

    mockProc.stderr.emit('data', Buffer.from('error: something failed'))
    mockProc.emit('close', 1)

    await expect(promise).rejects.toThrow('ffmpeg exited 1')
  })

  it('should reject with a friendly message when ffmpeg binary is missing (ENOENT)', async () => {
    const mockProc = createMockProcess()
    vi.mocked(spawn).mockReturnValue(mockProc as any)

    const promise = runFfmpeg(['-i', 'input.mp3', 'output.wav'])

    // Real spawn ENOENT errors carry code === 'ENOENT'
    mockProc.emit('error', Object.assign(new Error('spawn ffmpeg ENOENT'), { code: 'ENOENT' }))

    await expect(promise).rejects.toThrow('FFmpeg binary not found')
  })

  it('should reject with the original error on non-ENOENT spawn error', async () => {
    const mockProc = createMockProcess()
    vi.mocked(spawn).mockReturnValue(mockProc as any)

    const promise = runFfmpeg(['-i', 'input.mp3', 'output.wav'])

    const err = Object.assign(new Error('spawn ffmpeg EACCES'), { code: 'EACCES' })
    mockProc.emit('error', err)

    await expect(promise).rejects.toBe(err)
  })

  describe('extractLyrics', () => {
    it('should parse lyrics from ffprobe output', async () => {
      const mockProc = createMockProcess()
      vi.mocked(spawn).mockReturnValue(mockProc as any)

      const promise = extractLyrics('/path/to/file.mp3')

      mockProc.stdout.emit('data', Buffer.from('line1\nline2\nline3'))
      mockProc.emit('close', 0)

      const result = await promise
      expect(result).toBe('line1\nline2\nline3')
    })

    it('should return null when no lyrics tag present', async () => {
      const mockProc = createMockProcess()
      vi.mocked(spawn).mockReturnValue(mockProc as any)

      const promise = extractLyrics('/path/to/file.mp3')

      mockProc.stdout.emit('data', Buffer.from(''))
      mockProc.emit('close', 0)

      const result = await promise
      expect(result).toBeNull()
    })

    it('should return null on spawn error', async () => {
      const mockProc = createMockProcess()
      vi.mocked(spawn).mockReturnValue(mockProc as any)

      const promise = extractLyrics('/path/to/file.mp3')

      mockProc.emit('error', new Error('ENOENT'))

      const result = await promise
      expect(result).toBeNull()
    })

    it('should return null on non-zero exit with no output', async () => {
      const mockProc = createMockProcess()
      vi.mocked(spawn).mockReturnValue(mockProc as any)

      const promise = extractLyrics('/path/to/file.mp3')

      mockProc.stdout.emit('data', Buffer.from(''))
      mockProc.emit('close', 1)

      const result = await promise
      expect(result).toBeNull()
    })
  })

  it('should kill process on abort', async () => {
    const mockProc = createMockProcess()
    vi.mocked(spawn).mockReturnValue(mockProc as any)

    const controller = new AbortController()
    const promise = runFfmpeg(['-i', 'input.mp3', 'output.wav'], { signal: controller.signal })

    controller.abort()
    mockProc.emit('close', null)

    await expect(promise).rejects.toThrow('aborted')
    expect(mockProc.kill).toHaveBeenCalled()
  })

  it('should parse time progress from stderr with throttling', async () => {
    vi.useFakeTimers()
    const mockProc = createMockProcess()
    vi.mocked(spawn).mockReturnValue(mockProc as any)

    const onProgress = vi.fn()
    const promise = runFfmpeg(['-i', 'input.mp3', 'output.wav'], {
      onProgress,
      totalDurationSec: 100
    })

    // First data event: time=10s → 10%
    mockProc.stderr.emit('data', Buffer.from('time=00:00:10.00'))
    // Advance past the 200ms throttle window
    vi.advanceTimersByTime(250)

    // Second data event: time=50s → 50%
    mockProc.stderr.emit('data', Buffer.from('time=00:00:50.00'))
    vi.advanceTimersByTime(250)

    mockProc.emit('close', 0)
    await promise

    expect(onProgress).toHaveBeenCalledTimes(2)
    expect(onProgress.mock.calls[0][0]).toBeCloseTo(10, 0)
    expect(onProgress.mock.calls[1][0]).toBeCloseTo(50, 0)

    vi.useRealTimers()
  })
})

describe('probeDuration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should parse duration from ffprobe output', async () => {
    const mockProc = createMockProcess()
    vi.mocked(spawn).mockReturnValue(mockProc as any)

    const promise = probeDuration('test.mp3')

    mockProc.stdout.emit('data', Buffer.from('123.456'))
    mockProc.emit('close', 0)

    const duration = await promise
    expect(duration).toBeCloseTo(123.456)
  })

  it('should return 0 on invalid output', async () => {
    const mockProc = createMockProcess()
    vi.mocked(spawn).mockReturnValue(mockProc as any)

    const promise = probeDuration('test.mp3')

    mockProc.stdout.emit('data', Buffer.from('N/A'))
    mockProc.emit('close', 0)

    const duration = await promise
    expect(duration).toBe(0)
  })

  it('should return 0 on spawn error', async () => {
    const mockProc = createMockProcess()
    vi.mocked(spawn).mockReturnValue(mockProc as any)

    const promise = probeDuration('test.mp3')

    mockProc.emit('error', new Error('ENOENT'))

    const duration = await promise
    expect(duration).toBe(0)
  })
})

describe('run (high-level conversion)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function setupFormatTest() {
    const probeProc = createMockProcess()
    const ffmpegProc = createMockProcess()
    vi.mocked(spawn)
      .mockReturnValueOnce(probeProc as any)
      .mockReturnValueOnce(ffmpegProc as any)
    return { probeProc, ffmpegProc }
  }

  async function completeFormatTest(
    promise: Promise<unknown>,
    probeProc: EventEmitter & { stdout: EventEmitter; stderr: EventEmitter; kill: ReturnType<typeof vi.fn> },
    ffmpegProc: EventEmitter & { stdout: EventEmitter; stderr: EventEmitter; kill: ReturnType<typeof vi.fn> },
  ) {
    probeProc.stdout.emit('data', Buffer.from('120.5'))
    probeProc.emit('close', 0)
    // Emit ffmpeg close on next microtask so run() resumes from
    // probeDuration await and runFfmpeg registers its listener first
    await new Promise(process.nextTick)
    ffmpegProc.emit('close', 0)
    return promise
  }

  it('should perform full conversion pipeline', async () => {
    const probeProc = createMockProcess()
    const ffmpegProc = createMockProcess()
    vi.mocked(spawn)
      .mockReturnValueOnce(probeProc as any)
      .mockReturnValueOnce(ffmpegProc as any)

    const promise = run('/input/test.mp3', '/output/test.flac', { format: 'flac' })

    // Complete ffprobe probe
    probeProc.stdout.emit('data', Buffer.from('120.5'))
    probeProc.emit('close', 0)

    // Wait for run() to resume and call runFfmpeg before emitting
    await new Promise(process.nextTick)

    // Complete ffmpeg conversion
    ffmpegProc.emit('close', 0)

    const result = await promise
    expect(result.outputPath).toBe('/output/test.flac')
    expect(spawn).toHaveBeenCalledTimes(2)
  })

  it('should reject on ffmpeg conversion failure', async () => {
    const probeProc = createMockProcess()
    const ffmpegProc = createMockProcess()
    vi.mocked(spawn)
      .mockReturnValueOnce(probeProc as any)
      .mockReturnValueOnce(ffmpegProc as any)

    const promise = run('/input/test.mp3', '/output/test.flac', { format: 'flac' })

    probeProc.stdout.emit('data', Buffer.from('120.5'))
    probeProc.emit('close', 0)

    // Wait for run() to resume and call runFfmpeg before emitting
    await new Promise(process.nextTick)

    ffmpegProc.stderr.emit('data', Buffer.from('Conversion failed'))
    ffmpegProc.emit('close', 1)

    await expect(promise).rejects.toThrow(/ffmpeg exited|Conversion failed/)
  })

  // ---------------------------------------------------------------------------
  // Format-specific argument verification
  // ---------------------------------------------------------------------------

  it('should pass default mp3 codec and bitrate (320k) when format is mp3', async () => {
    const { probeProc, ffmpegProc } = setupFormatTest()
    const promise = run('/input/test.mp3', '/output/out.mp3', { format: 'mp3' })
    await completeFormatTest(promise, probeProc, ffmpegProc)

    const args = vi.mocked(spawn).mock.calls[1][1]
    expect(args).toContain('-codec:a')
    expect(args).toContain('libmp3lame')
    expect(args).toContain('-b:a')
    expect(args).toContain('320k')
  })

  it('should pass custom bitrate for lossy mp3 format', async () => {
    const { probeProc, ffmpegProc } = setupFormatTest()
    const promise = run('/input/test.mp3', '/output/out.mp3', { format: 'mp3', bitrate: '128k' })
    await completeFormatTest(promise, probeProc, ffmpegProc)

    const args = vi.mocked(spawn).mock.calls[1][1]
    const idx = args.indexOf('-b:a')
    expect(args[idx + 1]).toBe('128k')
  })

  it('should pass vbr quality flag (-q:a) for mp3', async () => {
    const { probeProc, ffmpegProc } = setupFormatTest()
    const promise = run('/input/test.mp3', '/output/out.mp3', { format: 'mp3', vbr: 5 })
    await completeFormatTest(promise, probeProc, ffmpegProc)

    const args = vi.mocked(spawn).mock.calls[1][1]
    expect(args).toContain('-q:a')
    const idx = args.indexOf('-q:a')
    expect(args[idx + 1]).toBe('5')
  })

  it('should pass joint stereo flag for mp3', async () => {
    const { probeProc, ffmpegProc } = setupFormatTest()
    const promise = run('/input/test.mp3', '/output/out.mp3', { format: 'mp3', jointStereo: true })
    await completeFormatTest(promise, probeProc, ffmpegProc)

    const args = vi.mocked(spawn).mock.calls[1][1]
    expect(args).toContain('-joint_stereo')
    const idx = args.indexOf('-joint_stereo')
    expect(args[idx + 1]).toBe('1')
  })

  it('should pass flac codec with compression level and bit depth args', async () => {
    const { probeProc, ffmpegProc } = setupFormatTest()
    const promise = run('/input/test.flac', '/output/out.flac', {
      format: 'flac',
      compressionLevel: 8,
      bitDepth: 24,
    })
    await completeFormatTest(promise, probeProc, ffmpegProc)

    const args = vi.mocked(spawn).mock.calls[1][1]
    expect(args).toContain('-codec:a')
    expect(args).toContain('flac')
    expect(args).toContain('-compression_level')
    const ci = args.indexOf('-compression_level')
    expect(args[ci + 1]).toBe('8')
    // FLAC stores 24-bit as s32
    expect(args).toContain('-sample_fmt')
    const fi = args.indexOf('-sample_fmt')
    expect(args[fi + 1]).toBe('s32')
  })

  it('should pass flac with s16 sample_fmt for 16-bit depth', async () => {
    const { probeProc, ffmpegProc } = setupFormatTest()
    const promise = run('/input/test.flac', '/output/out.flac', {
      format: 'flac',
      bitDepth: 16,
    })
    await completeFormatTest(promise, probeProc, ffmpegProc)

    const args = vi.mocked(spawn).mock.calls[1][1]
    const fi = args.indexOf('-sample_fmt')
    expect(args[fi + 1]).toBe('s16')
  })

  it('should pass opus codec with default bitrate 192k', async () => {
    const { probeProc, ffmpegProc } = setupFormatTest()
    const promise = run('/input/test.opus', '/output/out.opus', { format: 'opus' })
    await completeFormatTest(promise, probeProc, ffmpegProc)

    const args = vi.mocked(spawn).mock.calls[1][1]
    expect(args).toContain('-codec:a')
    expect(args).toContain('libopus')
    expect(args).toContain('-b:a')
    const bi = args.indexOf('-b:a')
    expect(args[bi + 1]).toBe('192k')
  })

  it('should pass vbr on/off flag for opus format', async () => {
    const { probeProc, ffmpegProc } = setupFormatTest()
    const promise = run('/input/test.opus', '/output/out.opus', { format: 'opus', vbr: 1 })
    await completeFormatTest(promise, probeProc, ffmpegProc)

    const args = vi.mocked(spawn).mock.calls[1][1]
    expect(args).toContain('-vbr')
    const idx = args.indexOf('-vbr')
    expect(args[idx + 1]).toBe('1')
  })

  it('should select pcm codec based on bit depth for wav format', async () => {
    const { probeProc, ffmpegProc } = setupFormatTest()
    const promise = run('/input/test.wav', '/output/out.wav', { format: 'wav', bitDepth: 24 })
    await completeFormatTest(promise, probeProc, ffmpegProc)

    const args = vi.mocked(spawn).mock.calls[1][1]
    expect(args).toContain('-codec:a')
    expect(args).toContain('pcm_s24le')
  })

  it('should default wav to pcm_s16le when no bit depth specified', async () => {
    const { probeProc, ffmpegProc } = setupFormatTest()
    const promise = run('/input/test.wav', '/output/out.wav', { format: 'wav' })
    await completeFormatTest(promise, probeProc, ffmpegProc)

    const args = vi.mocked(spawn).mock.calls[1][1]
    const ci = args.indexOf('-codec:a')
    expect(args[ci + 1]).toBe('pcm_s16le')
  })

  it('should use pcm_f32le for wav with 32-bit depth', async () => {
    const { probeProc, ffmpegProc } = setupFormatTest()
    const promise = run('/input/test.wav', '/output/out.wav', { format: 'wav', bitDepth: 32 })
    await completeFormatTest(promise, probeProc, ffmpegProc)

    const args = vi.mocked(spawn).mock.calls[1][1]
    const ci = args.indexOf('-codec:a')
    expect(args[ci + 1]).toBe('pcm_f32le')
  })

  it('should pass sample rate as -ar when specified', async () => {
    const { probeProc, ffmpegProc } = setupFormatTest()
    const promise = run('/input/test.mp3', '/output/out.mp3', {
      format: 'flac',
      sampleRate: 48000,
    })
    await completeFormatTest(promise, probeProc, ffmpegProc)

    const args = vi.mocked(spawn).mock.calls[1][1]
    expect(args).toContain('-ar')
    const idx = args.indexOf('-ar')
    expect(args[idx + 1]).toBe('48000')
  })

  it('should default format to mp3 when not specified', async () => {
    const { probeProc, ffmpegProc } = setupFormatTest()
    const promise = run('/input/test.mp3', '/output/out.mp3')
    await completeFormatTest(promise, probeProc, ffmpegProc)

    const args = vi.mocked(spawn).mock.calls[1][1]
    expect(args).toContain('-codec:a')
    expect(args).toContain('libmp3lame')
    expect(args).toContain('-b:a')
    expect(args).toContain('320k')
  })

  // ---------------------------------------------------------------------------
  // Lyrics & loudness argument verification
  // ---------------------------------------------------------------------------

  it('should pass loudnorm filter when enabled with default target', async () => {
    const { probeProc, ffmpegProc } = setupFormatTest()
    const promise = run('/input/test.mp3', '/output/out.mp3', {
      format: 'mp3',
      loudnormEnabled: true,
      loudnormTarget: -14
    })
    await completeFormatTest(promise, probeProc, ffmpegProc)

    const args = vi.mocked(spawn).mock.calls[1][1]
    const afIdx = args.indexOf('-af')
    expect(afIdx).toBeGreaterThanOrEqual(0)
    expect(args[afIdx + 1]).toContain('loudnorm=I=-14:LRA=7:TP=-1')
  })

  it('should pass loudnorm filter with custom target', async () => {
    const { probeProc, ffmpegProc } = setupFormatTest()
    const promise = run('/input/test.mp3', '/output/out.mp3', {
      format: 'mp3',
      loudnormEnabled: true,
      loudnormTarget: -9
    })
    await completeFormatTest(promise, probeProc, ffmpegProc)

    const args = vi.mocked(spawn).mock.calls[1][1]
    const afIdx = args.indexOf('-af')
    expect(args[afIdx + 1]).toContain('loudnorm=I=-9:LRA=7:TP=-1')
  })

  it('should not pass loudnorm filter when disabled', async () => {
    const { probeProc, ffmpegProc } = setupFormatTest()
    const promise = run('/input/test.mp3', '/output/out.mp3', {
      format: 'mp3',
      loudnormEnabled: false,
      loudnormTarget: -14
    })
    await completeFormatTest(promise, probeProc, ffmpegProc)

    const args = vi.mocked(spawn).mock.calls[1][1]
    expect(args).not.toContain('-af')
  })

  it('should pass loudnorm filter before codec args', async () => {
    const { probeProc, ffmpegProc } = setupFormatTest()
    const promise = run('/input/test.mp3', '/output/out.mp3', {
      format: 'mp3',
      loudnormEnabled: true,
      loudnormTarget: -14
    })
    await completeFormatTest(promise, probeProc, ffmpegProc)

    const args = vi.mocked(spawn).mock.calls[1][1]
    const afIdx = args.indexOf('-af')
    const codecIdx = args.indexOf('-codec:a')
    expect(afIdx).toBeGreaterThanOrEqual(0)
    expect(codecIdx).toBeGreaterThan(afIdx)
  })

  it('should pass lyrics metadata when provided', async () => {
    const { probeProc, ffmpegProc } = setupFormatTest()
    const promise = run('/input/test.mp3', '/output/out.mp3', {
      format: 'mp3',
      lyrics: 'line1\nline2'
    })
    await completeFormatTest(promise, probeProc, ffmpegProc)

    const args = vi.mocked(spawn).mock.calls[1][1]
    const metaIdx = args.indexOf('-metadata')
    expect(metaIdx).toBeGreaterThanOrEqual(0)
    expect(args[metaIdx + 1]).toContain('lyrics=line1')
  })
})

describe('formatFfmpegError', () => {
  it('should strip ANSI escape sequences', () => {
    const input = '\u001b[31mError: something failed\u001b[0m'
    expect(formatFfmpegError(input)).toBe('Error: something failed')
  })

  it('should resolve backspace characters (in-place progress overwrites)', () => {
    // ffmpeg overwrites digits in place with \b; the erased chars are gone
    const input = 'Error opening input: 12\b\bwrong.mp3'
    expect(formatFfmpegError(input)).toBe('Error opening input: wrong.mp3')
  })

  it('should split progress-update lines on carriage returns', () => {
    const input = 'frame=   10 size=0kB\rframe=   20 size=1kB\rInvalid data found when processing input'
    const result = formatFfmpegError(input)
    expect(result).toBe('Invalid data found when processing input')
  })

  it('should prefer the root-cause error line over the final trailer', () => {
    const input = [
      'Cannot determine format of input stream 0:0 after EOF',
      'Error marking filters as finished',
      'Error while filtering: Invalid data found when processing input',
      'size= 0kB time=N/A bitrate=N/A speed=N/A',
      'Conversion failed!'
    ].join('\n')
    const result = formatFfmpegError(input)
    expect(result).toBe('Cannot determine format of input stream 0:0 after EOF')
  })

  it('should drop noise lines and fall back to the last meaningful line', () => {
    const input = [
      'Press [q] to stop, [?] for help',
      'Stream #0:0: Audio: flac, 44100 Hz, stereo',
      'Output #0, mp3, to output.mp3',
      'size= 0kB time=N/A bitrate=N/A speed=N/A'
    ].join('\n')
    const result = formatFfmpegError(input)
    expect(result).toBe('Output #0, mp3, to output.mp3')
  })

  it('should return a fallback message for empty stderr', () => {
    expect(formatFfmpegError('')).toBe('unknown ffmpeg error')
  })

  it('should return a fallback message for whitespace-only stderr', () => {
    expect(formatFfmpegError('   \n  ')).toBe('unknown ffmpeg error')
  })
})


