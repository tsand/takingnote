var app = angular.module('services', []);

app.service('datastore', function ($q, $rootScope, dropstoreClient) {

    var APP_KEY = 'owmans4v3jkpi5x';
    var client = dropstoreClient.create({key: APP_KEY});
    $rootScope.client = client._client;
    var datastore = $q.defer();

    client.authenticate({interactive: true})
        .then(function (datastoreManager) {
            return datastoreManager.openDefaultDatastore();
        })
        .then(function (_datastore) {
            datastore.resolve(_datastore);
            $rootScope.$broadcast('authenticated');
        });

    return datastore.promise
});


/**
 * API for getting, creating, updating and various interactions with Folders in the datastore
 * @param $q - Angular Promise Service
 * @param $rootScope - Root Scope service
 * @param datastore - Datastore promise service
 * @constructor
 */
var FolderAPIService = function ($q, $rootScope, datastore) {
    var table;
    var _deferredTable = $q.defer();

    datastore.then(function (datastore) {
        table = datastore.getTable('folders');
        _deferredTable.resolve(table);
    });
    var tablePromise = _deferredTable.promise


    /**
     * Get the folders in the datastore
     * @param {object} [fieldValues] - properties of folders, if undefined will get all folders
     * @returns {array} - folders matching given properties
     */
    this.query = function (fieldValues) {
        fieldValues = typeof fieldValues !== 'undefined' ? fieldValues : {};
        return table.query(fieldValues);
    };


    /**
     * Get the folders in the datastore wrapped in an angular deferred promise
     * @param {object} [fieldValues] - properties of folders, if undefined will get all folders
     * @returns {function} - promise
     */
    this.deferredQuery = function (fieldValues) {
        fieldValues = typeof fieldValues !== 'undefined' ? fieldValues : {};

        var deferredQuery = $q.defer();
        tablePromise.then(function (table) {
            deferredQuery.resolve(table.query(fieldValues));
        });
        return deferredQuery.promise;
    };


    /**
     * Get a folder with the specified id
     * @param {string} id - the id of the folder to get
     * @returns {object} Folder with the given id
     */
    this.get = function (id) {
        return table.get(id);
    };


    /**
     * Create a new folder
     * @param {string} name - the name of the folder
     * @param {object} [fieldValues] - other properties of the folder
     * @returns {object} Created folder
     */
    this.create = function (name, fieldValues) {
        var date = new Date();
        name = typeof name !== 'undefined' ? name : 'New Folder';
        fieldValues = typeof fieldValues !== 'undefined' ? fieldValues : {
            created: date,
            modified: date,
            notes: [],
            name: name
        };

        // Create and return folder
        return table.insert(fieldValues);
    };


    /**
     * Delete folder with the given id
     * @param {string|object} folder - the folder or key of folder to delete
     * @param {boolean} [include_files=false] - delete the files contained in the folder
     * @returns {object} Deleted folder
     */
    this.delete = function (folder, include_files) {
        folder = typeof folder == 'string' ? this.get(folder) : folder;
        include_files = typeof include_files !== 'undefined' ? include_files : false;

        var notes = this.query({folder: folder.getId()});
        for (var i = 0; i < notes.length; i++) {
            var note = notes[i];
            if (include_files) {
                // If include_files, delete the notes in the folder
                note.deleteRecord();
            } else {
                note.set('folder', '')
            }
        }

        // Delete folder
        folder.deleteRecord();
        return folder;
    };


    /**
     * Update a folder with the given properties
     * @param {string|object} folder - the folder or key of folder to update
     * @param {object} props - the properties to add/change on the folder
     * @returns {object} Updated folder
     */
    this.update = function (folder, props) {
        folder = typeof folder == 'string' ? this.get(folder) : folder;

        props = typeof props !== 'undefined' ? props : {};
        props['modified'] = new Date();

        return folder.update(props)
    };


    /**
     * Rename the folder with the given id
     * @param {string|object} folder - the folder or key of folder to rename
     * @param {string} newName - the new name of the folder
     */
    this.rename = function (folder, newName) {
        this.update(folder, {name: newName});
    };


    /**
     * Add a note to the folder. This will not update the note.
     * @param {string|object} folder - the folder or key of folder to add to
     * @param {string} noteId - the id of the note to add
     */
    this.addNote = function (folder, noteId) {
        folder = typeof folder == 'string' ? this.get(folder) : folder;
        folder.get('notes').push(noteId);
    };


    /**
     * Removes a note from the folder. This will not update the note.
     * @param {string|object} folder - the folder or key of folder to remove the note from
     * @param {string} noteId - the id of the note to remove
     */
    this.removeNote = function (folder, noteId) {
        folder = typeof folder == 'string' ? this.get(folder) : folder;
        var notes = folder.get('notes');
        var index = notes.toArray().indexOf(noteId);
        notes.splice(index, 1);
    };
};
app.service('FolderAPI', FolderAPIService);


/**
 * API for getting, creating, updating and various interactions with Notes in the datastore
 * @param $q - Angular Promise Service
 * @param $rootScope - Root Scope service
 * @param datastore - Datastore promise service
 * @constructor
 */
var NoteAPIService = function ($q, $rootScope, datastore, FolderAPI) {
    var table;
    var _deferredTable = $q.defer();

    datastore.then(function (datastore) {
        table = datastore.getTable('notes');
        _deferredTable.resolve(table);
    });
    var tablePromise = _deferredTable.promise


    datastore.then(function (datastore) {
        table = datastore.getTable('notes');
        $rootScope.$broadcast('notes');
    });


    /**
     * Get the notes in the datastore
     * @param {object} [fieldValues] - properties of notes, if undefined will get all notes
     * @returns {array} - notes matching given properties
     */
    this.query = function (fieldValues) {
        fieldValues = typeof fieldValues !== 'undefined' ? fieldValues : {};
        return table.query(fieldValues);
    };


    /**
     * Get the notes in the datastore wrapped in an angular deferred promise
     * @param {object} [fieldValues] - properties of notes, if undefined will get all notes
     * @returns {function} - promise
     */
    this.deferredQuery = function (fieldValues) {
        fieldValues = typeof fieldValues !== 'undefined' ? fieldValues : {};

        var deferredQuery = $q.defer();
        tablePromise.then(function (table) {
            deferredQuery.resolve(table.query(fieldValues));
        });
        return deferredQuery.promise;
    };


    /**
     * Get the note with the specified id
     * @param {string} id - the id of the note to get
     * @returns {object} Note with the given id
     */
    this.get = function (id) {
        return table.get(id);
    };


    /**
     * Create a new note
     * @param {string} name - the name of the note
     * @param {string} folderId - the id of the folder it belongs to
     * @param {string} content - the content of the note
     * @returns {object} Created Note
     */
    this.create = function (name, folderId, content) {
        var date = new Date();
        content = typeof content !== 'undefined' ? content : '';

        var values = {
            name: name,
            created: date,
            modified: date,
            content: typeof content !== 'undefined' ? content : '',
            folder: folderId
        };

        if (!values.name || typeof values.name !== 'string') {
            throw "Invalid Note Name"
        }
        if (!values.folder || typeof values.folder !== 'string') {
            throw "Invalid Folder ID"
        }

        var folder = FolderAPI.get(folderId);
        if (!folder) {
            throw "Folder does not exist"
        }

        // Create Note
        var note = table.insert(values);

        // Add note to folder
        folder.get('notes').push(note.getId());

        return note;
    };


    /**
     * Delete a note
     * @param {string|object} note - the note or the id of the note to delete
     */
    this.delete = function (note) {
        note = typeof note == 'string' ? this.get(note) : note;

        // Remove from folder
        var folder = this.get(note.get('folder'));
        if (folder) {
            this.removeNote(folder.getId(), note.getId());
        }

        // Delete note
        note.deleteRecord();
        return note;
    };


    /**
     * Update a note with the given id
     * @param {string|object} note - the note or the id of the note to update
     * @param {object} props - the properties of the note to update
     * @returns {Object} Updated note
     */
    this.update = function (note, props) {
        note = typeof note == 'string' ? this.get(note) : note;

        // Default parameters
        props = typeof props !== 'undefined' ? props : {};

        // Update modified date
        props['modified'] = new Date();

        // Update folder if needed
        newFolderId = props['folder'];
        if (newFolderId) {
            var newFolderId = props['folder'];
            var currentFolderId = note.get('folder');

            // Make sure that folder is actually changing
            if (newFolderId != currentFolderId) {
                // Remove from current folder
                var currentFolder = this.get(props['folder']);
                var notes = currentFolder.get('notes');
                var index = notes.toArray().indexOf(note.getId());
                notes.splice(index, 1);

                // Add to new folder
                var newFolder = this.get(newFolderId);
                newFolder.get('notes').push(note.getId());
            }
        }

        return note.update(props)
    };


    /**
     * Rename the note with the given id
     * @param {string|object} note - the note or the id of the note to rename
     * @param {string} newName - the new name of the note
     * @returns {object} Renamed note
     */
    this.rename = function (note, newName) {
        return this.update(note, {name: newName})
    };


    /**
     * Get the shortened content of the note
     * @param {string|object} note - the note or the id of the note
     * @param {number} [maxLength=15] - the max length of the content
     * @param {boolean} [breakOnNewLine=true] - break at a new line
     */
    this.getShortContent = function (note, maxLength, breakOnNewLine) {
        note = typeof note == 'string' ? this.get(note) : note;

        // Default params
        maxLength = typeof maxLength !== 'undefined' ? maxLength : 15;
        breakOnNewLine = typeof breakOnNewLine !== 'undefined' ? breakOnNewLine : true;

        var content = note.get('content');

        // Split by new line
        var splitByNewLine = content.match(/[^\r\n]+/g);
        if (splitByNewLine) {
            for (var i = 0; i < splitByNewLine.length; i++) {
                var line = splitByNewLine[i].trim();

                if (line.length > 0) {
                    // TODO put line through markdown processor
                    return line.substring(0, maxLength);
                }
            }
        }
        return ''
    };
};
app.service('NoteAPI', NoteAPIService);


/**
 * API for getting, creating, updating and various interactions with Settings in the datastore
 * @param $q - Angular Promise Service
 * @param $rootScope - Root Scope service
 * @param datastore - Datastore promise service
 * @constructor
 */
var SettingAPIService = function ($q, $rootScope, datastore) {
    var table;
    var _deferredTable = $q.defer();

    datastore.then(function (datastore) {
        table = datastore.getTable('setting');
        _deferredTable.resolve(table);
    });
    var tablePromise = _deferredTable.promise;


    datastore.then(function (datastore) {
        table = datastore.getTable('notes');
        $rootScope.$broadcast('notes');
    });


    /**
     * Query for settings matching the given values
     * @param [fieldValues] - the values of the settings to get, if undefined gets all settings
     * @returns {array} the settings matching the given values
     */
    this.query = function (fieldValues) {
        fieldValues = typeof fieldValues !== 'undefined' ? fieldValues : {};
        return table.query(fieldValues);
    };

    /**
     * Get the settings in the datastore wrapped in an angular deferred promise
     * @param {object} [fieldValues] - properties of settings, if undefined will get all settings
     * @returns {function} - promise
     */
    this.deferredQuery = function (fieldValues) {
        fieldValues = typeof fieldValues !== 'undefined' ? fieldValues : {};

        var deferredQuery = $q.defer();
        tablePromise.then(function (table) {
            deferredQuery.resolve(table.query(fieldValues));
        });
        return deferredQuery.promise;
    };


    /**
     * Gets the setting with the given id
     * @param {string} id - the id of the setting to get
     * @returns {object} the setting with the given id
     */
    this.get = function (id) {
        return table.get(id)
    };


    /**
     * Create a new setting
     * @param {string} name - the name of the setting
     * @param {string|boolean|number} value - the value of the setting
     * @returns {object} Created setting
     */
    this.create = function (name, value) {
        value = typeof value !== 'undefined' ? value : null;
        return table.insert({
            name: name,
            value: value
        })
    };


    /**
     * Update setting with the given id
     * @param {string} id - the id of the setting to update
     * @param {object} props - the properties of the setting to update
     * @returns {object} Updated setting
     */
    this.update = function (id, props) {
        var setting = this.get(id);
        return setting.update(props);
    };


    /**
     * Delete the setting with the given id
     * @param {string} id - the id of the setting to delete
     * @returns {object} Deleted setting
     */
    this.delete = function (id) {
        return this.get(id).deleteRecord();
    };


    /**
     * Get a setting by its name
     * @param {string} name - the name of the setting to get
     * @returns {object} Setting with given name
     */
    this.getByName = function (name) {
        return this.query({name: name})[0];
    };


    /**
     * Change the value of a function with the given id
     * @param {string} id - the id of the function to change
     * @param {string|boolean|number} newValue - the new value of the setting
     * @returns {*|Object|Object|Object}
     */
    this.changeValue = function (id, newValue) {
        return this.update({value: newValue});
    };


    /**
     * Toggle a given setting. The setting must be a boolean setting
     * @param {string} id - the id of the setting to toggle
     * @returns {object} - the updated setting
     */
    this.toggle = function (id) {
        var setting = this.get(id);
        var value = setting.get('value');

        if (typeof value !== "boolean") {
            throw "Cannot toggle a non-boolean setting"
        }

        return setting.set('value', !value);
    };
};
app.service('SettingAPI', SettingAPIService);


app.service('fileUpload', function ($rootScope) {

    var isImage = function (fileType) {
        return fileType.match('image*') !== null;
    };


    this.upload = function (file) {

        if (file !== undefined) {

            var image = isImage(file.type);
            var path = '/' + file.type.split('/')[0] + '/' + file.name;

            if (isImage(file.type)) {
                image = true;
                path = '/image/' + file.name;
            }

            var result = $rootScope.client.writeFile(path, file, function (error, stat) {
                // Get url
                $rootScope.client.makeUrl(path, {download: true}, function (error, shareUrl) {

                    if (image) {
                        $rootScope.$broadcast('New Image', file.name, shareUrl.url);
                    } else {
                        $rootScope.$broadcast('New File', file.name, shareUrl.url)
                    }
                });
            });
        } else {
            alert('Invalid file');
        }
    }
});

