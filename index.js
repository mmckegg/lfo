module.exports = LFO

function LFO(audioContext, opts){
  var node = audioContext.createGain()

  var oscillator = node._oscillator = audioContext.createOscillator()
  var voltage = flatten(oscillator)

  var value = scale(voltage)

  var inverter = scale(oscillator)

  var adder = audioContext.createGain()
  adder.connect(node)

  var amp = scale(inverter)
  var ampMultiplier = scale(amp)

  ampMultiplier.gain.value = 0
  value.connect(ampMultiplier.gain)

  var rate = scale(voltage)
  var rateMultiplier = scale(rate)

  ampMultiplier.connect(node)
  value.connect(node)

  oscillator.frequency.value = 0
  rateMultiplier.connect(oscillator.frequency)

  // export params
  node.value = value.gain
  node.rate = rate.gain
  node.amp = amp.gain

  Object.defineProperties(node, props)

  node._state = {
    value: value,
    ampMultiplier: ampMultiplier,
    rateMultiplier: rateMultiplier,
    oscillator: oscillator,
    inverter: inverter,
    sync: false,
    tempo: null,
    mode: 'multiply'
  }

  return node
}

var props = {

  sync: {
    get: function(){
      return this._state.sync
    },
    set: function(value){
      this._state.sync = value
      refreshSync(this)
    }
  },

  mode: {
    get: function(){
      return this._state.mode
    },
    set: function(value){
      // modes: arate, multiply, add, subtract
      this._state.mode = value
      refreshMode(this)
    }
  },

  tempo: {
    get: function(){
      return this._state.tempo
    },
    set: function(value){
      this._state.tempo = value
      refreshSync(this)
    }
  },

  shape: {
    get: function(){
      if (this._state.inverter.gain.value < 0){
        return this._state.oscillator.type + '_i'
      } else {
        return this._state.oscillator.type
      }
    },
    set: function(value){
      var parts = value.split('_')
      this._state.shape = parts[0]
      this._state.inverter.gain.value = parts[1] == 'i' ? -1 : 1
      this._state.oscillator.type = parts[0]
    }
  },

  start: {
    value: function(at){
      this._state.oscillator.start(at)
      phaseOffset(this._state.oscillator, 0.5, Math.max(at, this._state.oscillator.context.currentTime))
    }
  },

  stop: {
    value: function(at){
      this._state.oscillator.stop(at)
    }
  },

  onended: {
    get: function(){
      return this._state.oscillator.onended
    },
    set: function(value){
      this._state.oscillator.onended = value
    }
  }

}

function refreshSync(node){
  if (node._state.sync && node._state.tempo){
    node._state.rateMultiplier.gain.value = node._state.tempo / 60
  } else {
    node._state.rateMultiplier.gain.value = 1
  }
}

function refreshMode(node){
  var mode = node._state.mode

  var ampMultiplier = node._state.ampMultiplier
  var value = node._state.value
  value.disconnect()

  if (mode === 'arate'){
    //TODO
  } else if (mode === 'multiply'){
    ampMultiplier.gain.value = 0
    value.connect(ampMultiplier.gain)
  } else if (mode === 'add'){
    ampMultiplier.gain.value = 1
    value.connect(node)
  } else if (mode === 'subtract'){
    ampMultiplier.gain.value = -1
    value.connect(node)
  }
}

function stop(at){
  this._state.oscillator.stop(at)
}

function phaseOffset(oscillator, offset, at){
  var value = oscillator.frequency.value
  oscillator.frequency.setValueAtTime(1000*offset, at)
  oscillator.frequency.setValueAtTime(value, at+1/1000)
}

var flat = new Float32Array([1,1])
function flatten(node){
  var shaper = node.context.createWaveShaper()
  shaper.curve = flat
  node.connect(shaper)
  return shaper
}

//function arate(node){
//  var shaper = node.context.createWaveShaper()
//  shaper.curve = log
//  node.connect(shaper)
//  return shaper
//}

function scale(node){
  var gain = node.context.createGain()
  node.connect(gain)
  return gain
}

//var res = 1000
//var max = Math.log(20000)/Math.log(10)
//var log = new Float32Array(res)
//for (var i=0;i<log.length;i++){
//  log[i] = Math.pow(10, max * (i/res))
//}//