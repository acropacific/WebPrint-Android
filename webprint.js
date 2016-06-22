/**
 * This file is part of WebPrint
 * 
 * @author Michael Wallace
 *
 * Copyright (C) 2015 Michael Wallace, WallaceIT
 *
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the GNU Lesser General Public License
 * (LGPL) version 2.1 which accompanies this distribution, and is available at
 * http://www.gnu.org/licenses/lgpl-2.1.html
 *
 * This software is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 */
var WebPrint = function (init, opt) {
    var options = {
        relayHost: "127.0.0.1",
        relayPort: "8080",
        listPrinterCallback: null,
        listPortsCallback: null,
        readyCallback: null
    };

    $.extend(options, opt);

    this.printRaw = function (data, printer) {
        var request = {a: "printraw", printer: printer, data: btoa(data)};
        sendAppletRequest(request);
    };

    this.printSerial = function (data, port) {
        if (isAndroid){
            alert("Serial port printing is not available in Android.");
            return;
        }
        var request = {a: "printraw", port: port, data: btoa(data)};
        sendAppletRequest(request);
    };
    
    this.printTcp = function (data, socket) {
        var request = {a: "printraw", socket: socket, data: btoa(data)};
        sendAppletRequest(request);
    };

    this.printHtml = function (data, printer) {
        if (isAndroid){
            alert("HTML printing is not available in Android.");
            return;
        }
        var request = {a: "printhtml", printer: printer, data: data};
        sendAppletRequest(request);
    };
    /*
     * Opens a port using the specified settings
     * @param port String eg. COM1 / TTY0
     * @param settings Object eg. {baud:9600, databits:8, stopbits:1, parity:even, flow:"none"}
     */
    this.openPort = function (port, settings) {
        var request = {a: "openport", port: port, settings: settings};
        sendAppletRequest(request);
    };

    this.requestPrinters = function () {
        sendAppletRequest({a: "listprinters"});
    };

    this.requestPorts = function () {
        if (!isAndroid)
            sendAppletRequest({a: "listports"});
    };

    function sendAppletRequest(data) {
        data.cookie = cookie;
        if (!wpwindow || wpwindow.closed || !wpready) {
            if (wpready){
               openPrintWindow();
            } else {
               webprint.checkRelay();
               console.log("Print applet connection not established...trying to reconnect");
            }
            setTimeout(function () {
                wpwindow.postMessage(JSON.stringify(data), "*");
            }, 220);
        }
        wpwindow.postMessage(JSON.stringify(data), "*");
    }

    var wpwindow;
    var wpready = false;
    function openPrintWindow() {
        wpready = false;
        wpwindow = window.open("http://"+options.relayHost+":"+options.relayPort+"/printwindow", 'WebPrintService');
        wpwindow.blur();
        window.focus();
    }

    var wptimeOut;
    this.checkRelay = function () {
        if (wpwindow && !wpwindow.closed) {
            wpwindow.close();
        }
        window.addEventListener("message", handleWebPrintMessage, false);
        openPrintWindow();
        wptimeOut = setTimeout(dispatchWebPrint, 2000);
    };

    function handleWebPrintMessage(event) {
        if (event.origin != "http://"+options.relayHost+":"+options.relayPort)
            return;
        switch (event.data.a) {
            case "init":
                clearTimeout(wptimeOut);
                wpready = true;
                sendAppletRequest({a:"init"});
                break;
            case "response":
                var response = JSON.parse(event.data.json);
                if (response.hasOwnProperty('ports')) {
                    if (options.listPortsCallback instanceof Function)
                        options.listPortsCallback(response.ports);
                } else if (response.hasOwnProperty('printers')) {
                    if (options.listPrinterCallback instanceof Function)
                        options.listPrinterCallback(response.printers);
                } else if (response.hasOwnProperty('error')) {
                    alert(response.error);
                }
                if (response.hasOwnProperty("cookie")){
                    cookie = response.cookie;
                    localStorage.setItem("webprint_auth", response.cookie);
                }
                if (response.hasOwnProperty("ready")){
                    if (options.readyCallback instanceof Function) options.readyCallback();
                }
                break;
            case "error": // cannot contact print applet from relay window
                webprint.checkRelay();
        }
        //alert("The Web Printing service has been loaded in a new tab, keep it open for faster printing.");
    }

    function dispatchWebPrint() {
        var answer = confirm("Cannot communicate with the printing app.\nWould you like to open/install the printing app?");
        if (answer) {
            if (isAndroid){
                document.location.href = "https://wallaceit.com.au/playstore/webprint/index.php";
                return;
            }
            var installFile="WebPrint.jar";
            if (navigator.appVersion.indexOf("Win")!=-1) installFile="WebPrint_windows_1_1.exe";
            if (navigator.appVersion.indexOf("Mac")!=-1) installFile="WebPrint_macos_1_1.dmg";
            if (navigator.appVersion.indexOf("X11")!=-1) installFile="WebPrint_unix_1_1.sh";
            if (navigator.appVersion.indexOf("Linux")!=-1) installFile="WebPrint_unix_1_1.sh";
            window.open("/yourinstalllocation/"+installFile, '_blank');
        }
    }
    
    var cookie = localStorage.getItem("webprint_auth");
    if (cookie==null){
        cookie = "";
    }

    var isAndroid = navigator.appVersion.indexOf("Android")!=-1;

    if (init) this.checkRelay();
    
    return this;
};



