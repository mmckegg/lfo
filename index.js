var shapes = require('oscillators')

module.exports = function(audioContext, clock){
  var node = Object.create(proto)
  node._targets = []
  node._syncs = []
  node._phase = 0
  node._lastValue = 0

  node.context = audioContext
  node.clock = clock

  node._handler = doSchedule.bind(node)

  node.clock.on('data', node._handler)

  node.rate = 1
  node.sync = false
  node.amp = 0.5
  node.value = 0.5
  node.phaseOffset = 0
  node.min = -Infinity
  node.max = Infinity

  return node
}

var proto = {

  start: function(at){
    // schedule wave sync at time
    this._syncs.push(at)
  },

  stop: function(at){
    // possibly don't need to do anything here
  },

  connect: function(param){
    if (!~this._targets.indexOf(param)){
      this._targets.push(param)
    }
  },
  disconnect: function(){
    var targets = this._targets
    for (var i=0;i<targets.length;i++){
      var target = targets[i]
      target.cancelScheduledValues(this.context.currentTime)
      target.setValueAtTime(this.value, this.context.currentTime)
    }
    targets.length = 0
  },
  destroy: function(){
    this.disconnect()
    node.clock.removeListener('data', node._handler)
  }
}

function doSchedule(schedule){
  var node = this

  var targets = node._targets
  var shape = shapes[node.shape] || shapes['sine']

  if (targets.length){

    var step = node.rate / node.context.sampleRate

    if (node.sync){
      step = step / schedule.beatDuration
    }

    var steps = schedule.duration * node.context.sampleRate
    var curve = generateCurve(steps, step, node._phase + node.phaseOffset, node._lastValue, node.value, node.amp, node.min, node.max, shape)

    node._lastValue = curve[curve.length-1]

    node._phase = (node._phase + steps * step) % 1

    for (var i=0;i<targets.length;i++){
      var target = targets[i]
      target.setValueCurveAtTime(curve, schedule.time, schedule.duration)
    }
  }
}

function generateCurve(steps, step, phase, lastValue, offset, amp, min, max, shape){
  var curve = new Float32Array(steps)

  for (var i=0;i<steps;i++){
    var nextValue = offset + (shape(phase) * amp)

    // fence
    nextValue = Math.min(max, Math.max(min, nextValue))

    lastValue = curve[i] = lastValue + (nextValue - lastValue) / 100
    phase = (1 + phase + step) % 1
  }
  return curve
}

var shapes = {
  sine: function(t){
    return Math.sin(t * Math.PI * 2)
  },
  sawtooth: function(t){
    return -1 + ((t % 1) * 2)
  },
  sawtooth_i: function(t){
    return 1 - ((t % 1) * 2)
  },
  triangle: function(t){
    var n = t % 0.5
    return t < 0.5 ? (-1 + n * 4) : (1 - n * 4)
  },
  square: function(t){
    return t < 0.5 ? -1 : 1
  }
}

function mod(a,b){
  return ((a%b)+b)%b;
}