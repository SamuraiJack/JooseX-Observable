Role('JooseX.Observable', {
    
    /*VERSION,*/
    
//    use : [ 
//        'JooseX.Observable.Channel',    
//        'JooseX.Observable.Listener', 
//        'JooseX.Observable.Event'    
//    ],
    
    
//    trait   : 'JooseX.Observable.Meta',
    
    
    has : {
        rootChannel             : {
            is          : 'rw',
            init        : function () { return new JooseX.Observable.Channel() }
        },
        
        suspendCounter          : 0
    },
    
        
    methods : {
        
        getBubbleTarget : function () {
        },
        
        
        parseEventPath : function (path) {
            var channels    = path.split('/')
            var eventName   = channels.pop()
            
            if (channels.length && !channels[ 0 ]) channels.shift()
            
            return {
                channels        : channels,
                eventName       : eventName
            }
        },
        
        
        on : function (path, func, scope, options) {
            if (!func) throw "Not valid listener function provided when subsribing on event: " + path
            
            var parsed      = this.parseEventPath(path)
            var channel     = this.getRootChannel().getChannel(parsed.channels)
            
            var listener    = new JooseX.Observable.Listener(Joose.O.extend(options || {}, {
                channel     : channel,
                eventName   : parsed.eventName,
                
                func        : func,
                scope       : scope
            }))
            
            channel.addListener(listener)
            
            return listener
        },
        
        
        un : function (path, func, scope) {
            
            if (path instanceof JooseX.Observable.Listener) {
                
                path.remove()
                
                return
            }
            
            var parsed      = this.parseEventPath(path)
            var channel     = this.getRootChannel().getChannel(parsed.channels, true)
            
            if (channel) channel.removeListenerByHandler(parsed.eventName, func, scope)
        },
        
        
        emit : function () {
            return this.fireEvent.apply(this, arguments)
        },
        
        
        fireEvent : function (path) {
            if (this.suspendCounter) return
            
            var args        = Array.prototype.slice.call(arguments, 1)

            var event       = new JooseX.Observable.Event({
                name        : path,
                args        : args,
                
                source      : this
            }) 
            
            return this.propagateEvent(event, path, args)
        },
        
        
        propagateEvent : function (event, path, args) {
            if (this.suspendCounter) return
            
            var parsed      = this.parseEventPath(path)
            var eventName   = parsed.eventName
            
            if (!eventName == '*' || eventName == '**') throw new Error("Can't fire an empty event or event with `*`, `**` names ")
            
            var activators  = []
            
            this.getRootChannel().getListenersFor(parsed.channels, eventName, activators)
            
            var res             = true
            
            event.current       = this
            
            if (activators.length) Joose.A.each(activators, function (activator) {
                event.splat = activator.splat
                
                res = activator.listener.activate(event, args) !== false && res
            })
            
            if (event.bubbling) {
                
                var further = this.getBubbleTarget()
                
                if (further) res = further.propagateEvent(event, path, args) !== false && res
            } 
                
            return res
        },
        
        
        hasListenerFor : function (path) {
            var parsed      = this.parseEventPath(path)
            
            return this.getRootChannel().hasListenerFor(parsed.channels, parsed.eventName)
        },
        
        
        purgeListeners  : function () {
            this.rootChannel.destroy()
            
            this.rootChannel = new JooseX.Observable.Channel()
        },
        
        
        suspendEvents : function () {
            this.suspendCounter++
        },
        
        
        resumeEvents : function () {
            this.suspendCounter--
            
            if (this.suspendCounter < 0) this.suspendCounter = 0
        }
    }
})