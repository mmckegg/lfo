lfo
===

Low frequency oscillator for automating Web Audio API AudioParams.

## Install

```bash
$ npm install lfo
```

## API

```js
var LFO = require('lfo')
```

### LFO(audioContext)

Returns an LFO [AudioNode](https://developer.mozilla.org/en-US/docs/Web/API/AudioNode) instance.

### node.value ([AudioParam](https://developer.mozilla.org/en-US/docs/Web/API/AudioParam))

Modulate this base `value` based on operation specified by `node.mode`.

### node.rate (AudioParam)

Oscillation rate in cycles per second (Hz).

### node.amp (AudioParam)

Amplitude of the oscillation.

### node.mode (get/set)

The operation to apply to `node.value`. Defaults to `'multiply'.

### node.shape (get/set)

The waveform shape: 'sine', 'triangle', 'sawtooth', 'sawtooth_i' or 'square'

### node.phaseOffset (get/set)

### node.sync (get/set)

When `true`, the oscillation rate is multiplied by `node.tempo / 60` to allow beat sync.

### node.tempo (get/set)

Set the tempo (BPM) for use when `node.sync` is `true`.

### node.connect(destinationAudioParam)

Connect the modulator to the desired destination audio param.

### node.disconnect()

Disconnect from any target AudioParams.

### node.start(at)

Starts the LFO at specified time. This method can only be called once. Create new instances of LFO for each scheduled events.

### node.stop(at)

Stops the LFO at specified time.

## Example

Create tremolo effect

```js

var LFO = require('lfo')

var audioContext = new AudioContext()
var oscillator = audioContext.createOscillator()
var gain = audioContext.createGain()

oscillator.connect(gain)
gain.connect(audioContext.destination)

var lfoModulator = LFO(audioContext)
gain.value = 2 // set oscillation centre value

lfoModulator.rate = 4 // hz
lfoModulator.shape = 'sine'
lfoModulator.connect(gain.gain)

lfoModulator.start(audioContext.currentTime)
oscillator.start(audioContext.currentTime)

lfoModulator.stop(audioContext.currentTime + 1)
oscillator.stop(audioContext.currentTime + 1)
```