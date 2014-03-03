module.exports = function LFO(audioContext){

  if (!audioContext.scheduler){
    throw new Error('audioContext.scheduler cannot be null. Please assign a scheduler (such as bopper)')
  }

  var node = Object.create(proto)
  node._targets = []
  node._syncs = []
  node._createdAt = audioContext.currentTime
  node._phase = 0
  node._currentValue = 0
  node._lastSchedule = null

  node.context = audioContext
  node.scheduler = audioContext.scheduler

  node._handler = doSchedule.bind(node)

  node.scheduler.on('data', node._handler)

  node.rate = 1
  node.sync = false
  node.trigger = false
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
    at = at || this.context.currentTime

    for (var i=0;i<this._syncs;i++){
      if (at < this._syncs[i]){
        this._syncs.splice(i, 0, at)
        return
      }
    }
    this._syncs.push(at)

    // reschedule if time already scheduled
    var lastSchedule = this._lastSchedule
    if (this.trigger && lastSchedule && at < (lastSchedule.time + lastSchedule.duration)){
      this._handler(lastSchedule, at)
    }
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
    node.scheduler.removeListener('data', node._handler)
  }
}

function doSchedule(schedule, startTime){
  var node = this

  var targets = node._targets
  var shape = shapes[node.shape] || shapes['sine']

  var lastValue = 0

  if (!startTime){
    node._lastSchedule = schedule
    node._lastValue = node._currentValue
    startTime = schedule.time
    lastValue = node._lastValue
  }

  var offset = startTime - schedule.time
  var duration = schedule.duration-offset

  if (targets.length){

    var rate = node.sync ? node.rate / schedule.beatDuration : node.rate
    var step = rate / node.context.sampleRate

    var referenceTime = getAndCleanupSyncTime(this, startTime+duration)

    if (this.trigger){
      node._phase = mod((schedule.time - referenceTime) * rate, 1)
    }

    var steps = duration * node.context.sampleRate
    var curve = generateCurve(steps, step, node._phase + node.phaseOffset, lastValue, node.value, node.amp, node.min, node.max, shape)

    node._currentValue = curve[curve.length-1]

    node._phase = (node._phase + steps * step) % 1

    for (var i=0;i<targets.length;i++){
      var target = targets[i]
      target.cancelScheduledValues(startTime)
      target.setValueCurveAtTime(curve, startTime, duration)
    }
  }
}

function generateCurve(steps, step, phase, lastValue, offset, amp, min, max, shape){
  var curve = new Float32Array(steps)

  for (var i=0;i<steps;i++){
    var nextValue = offset + (shape(phase) * amp)

    // fence
    nextValue = Math.min(max, Math.max(min, nextValue))

    // smoothing
    lastValue = curve[i] = lastValue + (nextValue - lastValue) / 50

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

function getAndCleanupSyncTime(node, at){
  var result = null
  for (var i=node._syncs.length-1;i>=0;i--){
    if (result){
      node._syncs.splice(i, 1)
    } else if ( at > node._syncs[i] ){
      result = node._syncs[i]
    }
  }
  return result || node._createdAt
}
