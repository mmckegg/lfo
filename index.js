module.exports = LFO

function LFO(audioContext){
  var node = audioContext.createGain()

  var inverter = audioContext.createGain()
  inverter.connect(node)

  node.output = audioContext.createGain()
  node.output.connect(inverter)


  var voltage = flatten(node.output)
  var rateVoltage = scale(voltage)
  var rateMultipler = scale(rateVoltage)

  var oscillator = audioContext.createOscillator()

  node.start = start
  node.stop = stop

  node.rate = rateVoltage.gain
  node.rate.value = 1

  node.amp = node.gain
  node.amp.value = 0.5

  node._shape = 'sine'
  node._sync = false
  node._syncing = false
  node._scheduler = audioContext.scheduler
  node._oscillators = []
  node._inverter = inverter
  node._rateMultipler = rateMultipler
  node._onTempoChange = _onTempoChange.bind(node)

  Object.defineProperties(node, properties)

  return node
}

var properties = {
  sync: {
    get: function(){
      return this._sync
    },
    set: function(value){
      this._sync = value
      refreshSync(this)
    }
  },
  shape: {
    get: function(){
      if (this._inverter.gain.value < 0){
        return this._shape + '_i'
      } else {
        return this._shape
      }
    },
    set: function(value){
      var parts = value.split('_')
      this._shape = parts[0]
      this._inverter.gain.value = parts[1] == 'i' ? -1 : 1
      this._oscillators.forEach(function(osc){
        osc.type = parts[0]
      })
    }
  }
}

function _onTempoChange(tempo){
  if (this._sync){
    this._rateMultipler.gain.value = tempo / 60
  }
}

function start(at){
  at = at || this.context.currentTime
  var oscillator = this.context.createOscillator()
  oscillator.frequency.value = 0
  oscillator.connect(this.output)

  this._rateMultipler.connect(oscillator.frequency)
  this._oscillators.push(oscillator)

  phaseOffset(oscillator, 0.5, at)

  oscillator.type = this._shape
  oscillator.start(at)
  refreshSync(this)
}

function stop(at){
  if (this._oscillators.length){
    this._oscillators.shift().stop(at)
    refreshSync(this)
  }
}

var flat = new Float32Array([1,1])
function flatten(node){
  var shaper = node.context.createWaveShaper()
  shaper.curve = flat
  node.connect(shaper)
  return shaper
}

function scale(node){
  var gain = node.context.createGain()
  node.connect(gain)
  return gain
}

function refreshSync(node){
  if (node._scheduler){
    if (node._sync && node._oscillators.length){
      if (!node._syncing){
        node._onTempoChange(node._scheduler.getTempo())
        node._scheduler.on('tempo', node._onTempoChange)
        node._syncing = true
      }
    } else if (node._syncing){
      node._scheduler.removeListener('tempo', node._onTempoChange)
      node._rateMultipler.gain.value = 1
      node._syncing = false
    }
  } else {
    node._rateMultipler.gain.value = 1
  }
}

function phaseOffset(oscillator, offset, at){
  var value = oscillator.frequency.value
  oscillator.frequency.setValueAtTime(1000*offset, at)
  oscillator.frequency.setValueAtTime(value, at+1/1000)
}

function log(node){
  var audioContext = node.context
  var viewer = audioContext.createScriptProcessor(2048, 1)
  node.connect(viewer)
  viewer.onaudioprocess = function(e){
    console.log(e.inputBuffer.getChannelData(0)[0])
  }
  window.viewers = window.viewers || []
  window.viewers.push(viewer)
  viewer.connect(audioContext.destination)
}