/*

    cloud.js

    a backend API for SNAP!

    written by Jens Mönig

    Copyright (C) 2014 by Jens Mönig

    This file is part of Snap!.

    Snap! is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as
    published by the Free Software Foundation, either version 3 of
    the License, or (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.

*/

// Global settings /////////////////////////////////////////////////////

/*global modules, IDE_Morph, SnapSerializer, hex_sha512, alert, nop*/

modules.cloud = '2014-January-09';

// Global stuff

var Cloud;

var SnapCloud = new Cloud();

// Cloud /////////////////////////////////////////////////////////////

function Cloud() {
    // If we are logged in, record our username
    if(config.user !== undefined) {
        this.user = config.user;
    }
    if(config.urls !== undefined) {
        if(config.urls.create_project_url !== undefined) {
            this.create_project_url = config.urls.create_project_url;
        }
        if(config.urls.create_file_url !== undefined) {
            this.create_file_url = config.urls.create_file_url;
        }
        if(config.urls.list_project_url !== undefined) {
            this.list_project_url = config.urls.list_project_url;
        }
        if(config.urls.login_url !== undefined) {
            this.login_url = config.urls.login_url
        }
        if(config.urls.user_detail_url !== undefined) {
            this.user_detail_url = config.urls.user_detail_url;
        }
        this.user_api_detail_url = config.urls.user_api_detail_url;
        if(config.urls.project_url_root !== undefined) {
            this.project_url_root = config.urls.project_url_root;
        }
    }
    this.user_id = config.user_id;
    this.application_id = config.application_id;
}

// Cloud: Snap! API

Cloud.prototype.login = function (
    username,
    password,
    callBack,
    errorCall
) {
    var myself=this;
    var myCallBack = function(data, textStatus, jqXHR) {
        // Update user
         $.ajax({
            dataType: "json",
            url: myself.user_api_detail_url,
            success: function(data) {
                myself.user_id = data.id;
            }
         });
        callBack(data, textStatus);
    };
    $.post(this.login_url, {'username': username, 'password': password}, myCallBack).fail(errorCall);
};

Cloud.prototype.saveProject = function (ide, callBack, errorCall) {
    if(!this.loggedIn()) {
        return;
    }
    // Helper function, kindly donated by http://stackoverflow.com/questions/4998908/convert-data-uri-to-file-then-append-to-formdata
    function dataURItoBlob(dataURI, type) {
        var binary;
        if (dataURI.split(',')[0].indexOf('base64') >= 0)
            binary = atob(dataURI.split(',')[1]);
        else
            binary = unescape(dataURI.split(',')[1]);
        //var binary = atob(dataURI.split(',')[1]);
        var array = [];
        for(var i = 0; i < binary.length; i++) {
            array.push(binary.charCodeAt(i));
        }
        return new Blob([new Uint8Array(array)], {type: type});
    }

    // Get a picture of the stage
    var image_string = ide.stage.fullImageClassic().toDataURL();
    var blob = dataURItoBlob(image_string, 'image/png');
    var image = new FormData();
    image.append('file', blob);
    
    // Get the XML save file
    var xml_string = 'data:text/xml,' + encodeURIComponent(ide.serializer.serialize(ide.stage));
    blob = dataURItoBlob(xml_string, 'text/xml');
    var xml = new FormData();
    xml.append('file', blob);

    var upload_project;

    // Upload the two
    var completed = 0;
    var image_id, xml_id;
    function success(data, textStatus, jqXHR) {
        completed++;
        if(completed == 2) {
            // Upload project, then done
            upload_project();
        }
    }
    //$.post(this.create_file_url, {'file':blob}, success, "json");
    $.ajax({
        type: 'POST',
        url: this.create_file_url,
        data: image,
        processData: false,
        contentType: false,
        success: function(data) {
            completed++;
            image_id = data.id;

            if(completed == 2) {
                upload_project();
            }
        }
    }).fail(errorCall);
    $.ajax({
        type:'POST',
        url: this.create_file_url,
        data: xml,
        processData: false,
        contentType:false,
        success: function(data) {
            completed++;
            xml_id = data.id;

            if(completed == 2) {
                upload_project();
            }
        }
    }).fail(errorCall);


    // Create the actual project
    var create_project_url = this.create_project_url;
    var myself = this;
    upload_project = function() {
        if(myself.name == ide.projectName) {
            $.ajax({
                type: 'PUT',
                url: create_project_url+myself.project_id, 
                data: {
                    name: ide.projectName,
                    description: '',
                    application: myself.application_id,
                    project: xml_id,
                    screenshot: image_id
                }, 
                success: function(data, stuff) {
                  callBack(data, stuff);
                  myself.updateURL(myself.project_url_root + data.id);
                },
                dataType: 'json'
            }).fail(errorCall);
        } else {
            $.post(create_project_url, {
                name: ide.projectName,
                description: '',
                application: myself.application_id,
                project: xml_id,
                screenshot: image_id
            }, function(data, stuff) {
                myself.updateURL(myself.project_url_root + data.id);
                callBack(data, stuff);
              }, 'json').fail(errorCall);
        }
        myself.name = ide.projectName;
    }

    // Alert user
};

Cloud.prototype.openProject = function(project, callBack, errorCall) {
    var myself = this;
    $.get(project.project_url, null, function(data) {
        myself.project_id = project.id;
        myself.name = project.name;
        myself.updateURL(myself.project_url_root+project.id);
        callBack(data);
    }).fail(errorCall);
}

Cloud.prototype.getProjectList = function(callBack, errorCall) {
    if(!this.loggedIn())
      return;
    $.get(this.list_project_url+"?owner="+this.user_id, null, function(data) {
        callBack(data);
    }, "json").fail(errorCall);
};

Cloud.prototype.loggedIn = function() {
    if(this.user_id === undefined) {
        this.message("You are not logged in");
        return false;
    }
    return true;
};

Cloud.prototype.message = function (string) {
    alert(string);
};

Cloud.prototype.updateURL = function(URL) {
    if(window.history !== undefined && window.history.pushState !== undefined) {
        window.history.pushState({}, "", URL);
    }
};


// Cloud: backend communication

// Cloud: payload transformation

// Cloud: user messages (to be overridden)

Cloud.prototype.message = function (string) {
    alert(string);
};
