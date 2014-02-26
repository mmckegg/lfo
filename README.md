lfo
===

Low frequency oscillator for automating Web Audio API AudioParams.

Must be connected to a scheduling clock source such as [bopper](https://github.com/mmckegg/bopper).

## Install

```bash
$ npm install lfo
```

## API

```js
var LFO = require('lfo')
```

### LFO(audioContext, clock)

Returns an LFO ModulatorNode instance.

### node.sync (get/set)

True or false. Whether to synchronize the oscillator with beats from the clock source.

### node.rate (get/set)

Oscillation rate in cycles per second (Hz) or cycles per beat if `node.sync == true`.

### node.shape (get/set)

The waveform shape: 'sine', 'triangle', 'sawtooth', 'sawtooth_i' or 'square'

### node.value (get/set)

The center value of the oscillation.

### node.amp (get/set)

Amplitude of the oscillation.

### node.connect(destinationAudioParam)

Connect the modulator to the desired destination audio param.

### node.disconnect()

Disconnect from any target AudioParams and reset to `node.value`.

### node.start(at)

When `node.trigger` is enabled, synchronize the waveform cycle start at specified time. 

### node.destroy()

Immediately disconnect from target AudioParam and clean up any state.

## Example

Create tremolo effect

```js

var Clock = require('bopper')
var LFO = require('lfo')

var audioContext = new webkitAudioContext()
var clock = new Clock(audioContext)
var oscillator = audioContext.createOscillator()
var gain = audioContext.createGain()

clock.setTempo(120)
clock.start()

oscillator.connect(gain)
gain.connect(audioContext.destination)

var lfoModulator = LFO(audioContext, clock)
lfoModulator.connect(gain.gain)

lfoModulator.rate = 4 // hz
lfoModulator.shape = 'sine'

lfoModulator.start(audioContext.currentTime)
oscillator.start(audioContext.currentTime)

lfoModulator.stop(audioContext.currentTime + 1)
oscillator.stop(audioContext.currentTime + 1)
```