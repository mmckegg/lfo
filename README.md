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

Returns an LFO ModulatorNode instance.

### node.rate (get/set)

Oscillation rate in cycles per second (Hz).

### node.amp (get/set)

Amplitude of the oscillation.

### node.shape (get/set)

The waveform shape: 'sine', 'triangle', 'sawtooth', 'sawtooth_i' or 'square'

### node.sync (get/set)

When `true`, the oscillation rate is multiplied by `audioContext.scheduler.getTempo() / 60` to allow beat sync.

### node.connect(destinationAudioParam)

Connect the modulator to the desired destination audio param.

### node.disconnect()

Disconnect from any target AudioParams.

### node.start(at)

Starts the LFO at specified time.

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