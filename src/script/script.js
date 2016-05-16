pc.extend(pc, function () {
    var rawToValue = function(app, args, value, old) {
        // TODO scripts2
        // arrays
        switch(args.type) {
            case 'boolean':
                return !! value;
                break;
            case 'number':
                if (typeof(value) === 'number') {
                    return value;
                } else if (typeof(value) === 'string') {
                    var v = parseInt(value, 10);
                    if (isNaN(v)) return null;
                    return v;
                } else if (typeof(value) === 'boolean') {
                    return 0 + value;
                } else {
                    return null;
                }
                break;
            case 'json':
                if (typeof(value) === 'object') {
                    return value;
                } else {
                    try {
                        return JSON.parse(value);
                    } catch(ex) {
                        return null;
                    }
                }
                break;
            case 'asset':
                if (value instanceof pc.Asset) {
                    return value;
                } else if (typeof(value) === 'number') {
                    return app.assets.get(value) || null;
                } else if (typeof(value) === 'string') {
                    return app.assets.get(parseInt(value, 10)) || null;
                } else {
                    return null;
                }
                break;
            case 'entity':
                if (value instanceof pc.Entity) {
                    return value;
                } else if (typeof(value) === 'string') {
                    return app.root.findByGuid(value);
                } else {
                    return null;
                }
                break;
            case 'rgb':
            case 'rgba':
                if (value instanceof pc.Color) {
                    if (old instanceof pc.Color) {
                        old.copy(value);
                        return old;
                    } else {
                        return value;
                    }
                } else if (value instanceof Array && value.length >= 3 && value.length <= 4) {
                    for(var i = 0; i < value.length; i++) {
                        if (typeof(value[i]) !== 'number')
                            return null;
                    }
                    if (! old) old = new pc.Color();

                    for(var i = 0; i < 4; i++)
                        old.data[i] = (i === 4 && value.length === 3) ? 1 : value[i];

                    return old;
                } else if (typeof(value) === 'string' && /#([0-9abcdef]{2}){3,4}/i.test(value)) {
                    if (! old)
                        old = new pc.Color();

                    old.fromString(value);
                    return old;
                } else {
                    return null;
                }
                break;
            case 'vec2':
            case 'vec3':
            case 'vec4':
                var len = parseInt(args.type.slice(3), 10);

                if (value instanceof pc['Vec' + len]) {
                    if (old instanceof pc['Vec' + len]) {
                        old.copy(value);
                        return old;
                    } else {
                        return value;
                    }
                } else if (value instanceof Array && value.length === len) {
                    for(var i = 0; i < value.length; i++) {
                        if (typeof(value[i]) !== 'number')
                            return null;
                    }
                    if (! old) old = new pc['Vec' + len];

                    for(var i = 0; i < len; i++)
                        old.data[i] = value[i];

                    return old;
                } else {
                    return null;
                }
                break;
            case 'curve':
                // TODO scripts2
                // curves
                break;
        }

        return value;
    };


    /**
    * @name pc.ScriptAttributes
    * @class Container of Script Attribute definitions
    * @description Implements an interface to add/remove attributes to a {@link pc.ScriptObject}.
    * @param {pc.ScriptObject} scriptObject The {@link pc.ScriptObject} that the attributes relate to.
    */
    var ScriptAttributes = function(scriptObject) {
        this.scriptObject = scriptObject;
        this.index = { };
    };

    /**
     * @function
     * @name pc.ScriptAttributes#add
     * @description Add Attribute
     * @param {String} name The name of the attribute
     * @param {Object} args Object with arguments for the attribute
     * @param {String} args.type Type of the attribute's value, list of possible types:
     * boolean, number, string, json, asset, entity, rgb, rgba, vec2, vec3, vec4, curve
     * @param {?} [args.default] Default attribute value
     * @param {String} [args.title] Title for Editor field
     * @param {String} [args.description] Description for Editor field
     * @param {(String|String[])} [args.placeholder] Placeholder value for Editor field.
     * For multi-field types, such as vec2, vec3, and others use array of strings.
     * @param {Boolean} [args.array] Whether attribute can hold single or multiple values
     * @param {Number} [args.size] The maximum number of values that can be set if the attribute is an array.
     * @param {Number} [args.min] Minimum value for type 'number', if max and min are defined, a slider will be rendered in Editor's UI
     * @param {Number} [args.max] Maximum value for type 'number', if max and min are defined, a slider will be rendered in Editor's UI
     * @param {Number} [args.precision] Level of precision for field type 'number' with floating values
     * @param {String} [args.assetType] Name of asset type to be used in 'asset' type attribute picker in Editor's UI, defaults to '*' (all)
     * @param {Strings[]} [args.curves] List of names for Curves for field type 'curve'
     * @param {String} [args.color] String of color channels for Curves for field type 'curve', can be any combination of `rgba` characters.
     * Defining this property will render Gradient in Editor's field UI
     * @param {Object[]} [args.enum] List of fixed choices for field, defined as array of objects, where key in object is a title of an option
     * @example
     * PlayerController.attributes.add('fullName', {
     *     type: 'string',
     * });
     * @example
     * PlayerController.attributes.add('speed', {
     *     type: 'number',
     *     title: 'Speed',
     *     placeholder: 'km/h',
     *     default: 22.2
     * });
     * @example
     * PlayerController.attributes.add('resolution', {
     *     type: 'number',
     *     default: 32,
     *     enum: [
     *        { '32x32': 32 },
     *        { '64x64': 64 },
     *        { '128x128': 128 }
     *     ]
     * });
     */
    ScriptAttributes.prototype.add = function(name, args) {
        if (this.index[name]) {
            console.warn('attribute \'' + name + '\' is already defined for script object \'' + this.scriptObject.name + '\'');
            return;
        } else if (pc.Script.reservedAttributes[name]) {
            console.warn('attribute \'' + name + '\' is a reserved attribute name');
            return;
        }

        this.index[name] = args;

        Object.defineProperty(this.scriptObject.prototype, name, {
            get: function() {
                return this.__attributes[name];
            },
            set: function(raw) {
                var old = this.__attributes[name];

                // convert to appropriate type
                this.__attributes[name] = rawToValue(this.app, args, raw, old);

                this.fire('attr', name, this.__attributes[name], old);
                this.fire('attr:' + name, this.__attributes[name], old);
            }
        });
    };

    /**
     * @function
     * @name pc.ScriptAttributes#remove
     * @description Remove an attribute
     * @param {String} name Name of the attribute
     * @returns {Boolean} True if removed or false if not defined
     * @example
     * PlayerController.attributes.remove('fullName');
     */
    ScriptAttributes.prototype.remove = function(name) {
        if (! this.index[name])
            return false;

        delete this.index[name];
        delete this.scriptObject.prototype[name];
        return true;
    };

    /**
     * @function
     * @name pc.ScriptAttributes#has
     * @description Detect if an attribute is defined
     * @param {String} name Name of the attribute
     * @returns {Boolean} True if Attribute is defined
     * @example
     * if (PlayerController.attributes.has('fullName')) {
     *     // attribute `fullName` is defined
     * });
     */
    ScriptAttributes.prototype.has = function(name) {
        return !! this.index[name];
    };

    /**
     * @function
     * @name pc.ScriptAttributes#get
     * @description Get an attribute by name.
     * Note: Changing argument properties will not affect existing script instances
     * @param {String} name Name of the attribute
     * @returns {?Object} Arguments with attribute properties
     * @example
     * // changing default value for an attribute 'fullName'
     * var attr = PlayerController.attributes.get('fullName');
     * if (attr) attr.default = 'Unknown';
     */
    ScriptAttributes.prototype.get = function(name) {
        return this.index[name] || null;
    };


    /**
    * @name pc.Script
    * @class Class to create named scripts.
    * It returns a constructor function for a new {@link pc.ScriptObject},
    * which is auto-registered to the {@link pc.ScriptRegistry} using it's name.
    * @description This is the main interface to create scripts,
    * which are used to define custom logic for applications.
    * @param {String} name The unique name of the script. The name is used when performing hot-swapping of
    * scripts at runtime. In order to perform hot-swapping at runtime make sure to define a `swap` method in the prototype of the script.
    * A script name cannot start with anything else than an alphabetic character. There is also a reserved list of names that cannot be used:
    * system, entity, create, destroy, swap, move, scripts, onEnable, onDisable, onPostStateChange, has, on, off, fire, once, hasEvent
    * @param {pc.Application} [app] The application that contains the {@link pc.ScriptRegistry} where scripts will be added. If undefined then the application
    * returned by `pc.Application.getApplication()` will be used.
    * @returns {function} Returns a constructor function for a new {@link pc.ScriptObject} which the developer is meant to extend by adding attributes and prototype methods.
    */
    var Script = function (name, app) {
        if (Script.reservedScripts[name])
            throw new Error('script name: \'' + name + '\' is reserved, please change script name');

        /**
        * @name pc.ScriptObject
        * @class A class that represents a custom script, that can be extended by the developer with attributes and prototype methods.
        * Use {@link pc.Script} to create new {@link pc.ScriptObject}s.
        * @property {pc.Application} app The {@link pc.Application} that the script belongs to.
        * @property {pc.Entity} entity The entity that the script belongs to.
        * @property {Boolean} enabled True if the script is running, False when the is not running, or if its {@link pc.Entity} or any of its parents are disabled or if the {@link pc.ScriptComponent} is disabled.
        * When disabled the update methods of the script will not be called. The initialize and postInitialize methods will run once when the script has been enabled during the application's tick.
        * @example
        * var PlayerController = new pc.Script('playerController');
        *
        * PlayerController.prototype.initialize = function () {
        *     this.speed = 5;
        * }
        *
        * PlayerController.prototype.update = function (dt) {
        *     this.entity.translate(this.speed * dt, 0, 0);
        * }
        */
        var script = function(args) {
            if (! args || ! args.app || ! args.entity)
                console.warn('script \'' + name + '\' has missing arguments in constructor');

            pc.events.attach(this);

            this.app = args.app;
            this.entity = args.entity;
            this._enabled = typeof(args.enabled) === 'boolean' ? args.enabled : true;
            this._enabledOld = this.enabled;
            this.__attributes = { };
            this.__attributesRaw = args.attributes || null;
            this.__scriptObject = script;
        };

        /**
         * @private
         * @readonly
         * @static
         * @name pc.ScriptObject#__name
         * @type String
         * @description Name of a Script Object.
         */
        script.__name = name;

        /**
         * @field
         * @static
         * @readonly
         * @name pc.ScriptObject.attributes
         * @type pc.ScriptAttributes
         * @description The interface to define attributes for {@link pc.ScriptObject}s.
         * Refer to {@link pc.ScriptAttributes}
         * @example
         * var PlayerController = new pc.Script('playerController');
         *
         * PlayerController.attributes.add('speed', {
         *     type: 'number',
         *     title: 'Speed',
         *     placeholder: 'km/h',
         *     default: 22.2
         * });
         */
        script.attributes = new ScriptAttributes(script);

        // initialize attributes
        script.prototype.__initializeAttributes = function() {
            if (! this.__attributesRaw)
                return;

            // set attributes values
            for(var key in script.attributes.index) {
                if (this.__attributesRaw && this.__attributesRaw.hasOwnProperty(key)) {
                    this[key] = this.__attributesRaw[key];
                } else if (script.attributes.index[key].hasOwnProperty('default')) {
                    this[key] = script.attributes.index[key].default;
                } else {
                    this[key] = null;
                }
            }

            this.__attributesRaw = null;
        };

        /**
         * @readonly
         * @static
         * @function
         * @name pc.ScriptObject#extend
         * @param {Object} methods Object with methods, where key - is name of method, and value - is function.
         * @description Shorthand function to extend the prototype of a {@link pc.ScriptObject} with a list of methods.
         * @example
         * var PlayerController = new pc.Script('playerController');
         *
         * PlayerController.extend({
         *     initialize: function() {
         *         // called once on initialize
         *     },
         *     update: function(dt) {
         *         // called each tick
         *     }
         * })
         */
        script.extend = function(methods) {
            for(var key in methods) {
                if (! methods.hasOwnProperty(key))
                    continue;

                script.prototype[key] = methods[key];
            }
        };

        /**
        * @event
        * @name pc.ScriptObject#enabled
        * @description Fired when a script becomes enabled.
        * @example
        * PlayerController.prototype.initialize = function() {
        *     this.on('enabled', function() {
        *         // script is now enabled
        *     });
        * };
        */

        /**
        * @event
        * @name pc.ScriptObject#disabled
        * @description Fired when a script becomes disabled
        * @example
        * PlayerController.prototype.initialize = function() {
        *     this.on('disabled', function() {
        *         // script is now disabled
        *     });
        * };
        */

        /**
        * @event
        * @name pc.ScriptObject#state
        * @description Fired when the state of a script changes to enabled or disabled
        * @param {Boolean} enabled True if now enabled, False if disabled
        * @example
        * PlayerController.prototype.initialize = function() {
        *     this.on('state', function(enabled) {
        *         console.log('Script Instance is now ' + (enabled ? 'enabled' : 'disabled'));
        *     });
        * };
        */

        /**
        * @event
        * @name pc.ScriptObject#destroy
        * @description Fired when a script is destroyed
        * @example
        * PlayerController.prototype.initialize = function() {
        *     this.on('destroy', function() {
        *         // no more part of an entity
        *         // good place to cleanup entity from destroyed script
        *     });
        * };
        */

        /**
        * @event
        * @name pc.ScriptObject#attr
        * @description Fired when a script attribute has been changed
        * @param {String} name The name of the attribute
        * @param {object} value The new value of the attribute
        * @param {object} valueOld The old value of the attribute
        * @example
        * PlayerController.prototype.initialize = function() {
        *     this.on('attr', function(name, value, valueOld) {
        *         console.log(name + ' been changed from ' + valueOld + ' to ' + value);
        *     });
        * };
        */

        /**
        * @event
        * @name pc.ScriptObject#attr:[name]
        * @description Fired when a specific script attribute has been changed
        * @param {object} value New value
        * @param {object} valueOld Old value
        * @example
        * PlayerController.prototype.initialize = function() {
        *     this.on('attr:speed', function(value, valueOld) {
        *         console.log('speed changed from ' + valueOld + ' to ' + value);
        *     });
        * };
        */

        Object.defineProperty(script.prototype, 'enabled', {
            get: function() {
                return this._enabled && this.entity.script.enabled && this.entity.enabled;
            },
            set: function(value) {
                if (this._enabled !== !! value)
                    this._enabled = !! value;

                if (this.enabled !== this._enabledOld) {
                    this._enabledOld = this.enabled;
                    this.fire(this.enabled ? 'enabled' : 'disabled');
                    this.fire('state', this.enabled);
                }
            }
        });

        // add to scripts registry
        var registry = app ? app.scripts : pc.Application.getApplication().scripts;
        registry.add(script);

        pc.ScriptHandler._push(script);

        return script;
    };

    // reserved scripts
    Script.reservedScripts = [
        'system', 'entity', 'create', 'destroy', 'swap', 'move',
        'scripts', '_scripts', '_scriptsIndex', '_scriptsData',
        'enabled', '_oldState', 'onEnable', 'onDisable', 'onPostStateChange',
        '_onSetEnabled', '_checkState', '_onBeforeRemove',
        '_onInitializeAttributes', '_onInitialize', '_onPostInitialize',
        '_onUpdate', '_onFixedUpdate', '_onPostUpdate',
        '_callbacks', 'has', 'on', 'off', 'fire', 'once', 'hasEvent'
    ];
    var reservedScripts = { };
    for(var i = 0; i < Script.reservedScripts.length; i++)
        reservedScripts[Script.reservedScripts[i]] = 1;
    Script.reservedScripts = reservedScripts;


    // reserved script attribute names
    Script.reservedAttributes = [
        'app', 'entity', 'enabled', '_enabled', '_enabledOld',
        '__attributes', '__attributesRaw', '__scriptObject',
        '_callbacks', 'has', 'on', 'off', 'fire', 'once', 'hasEvent'
    ];
    var reservedAttributes = { };
    for(var i = 0; i < Script.reservedAttributes.length; i++)
        reservedAttributes[Script.reservedAttributes[i]] = 1;
    Script.reservedAttributes = reservedAttributes;


    return {
        Script: Script
    };
}());
