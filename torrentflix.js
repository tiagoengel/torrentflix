var torrentstream = require('torrent-stream');
var fs = require('fs');
var pump = require('pump');
var util = require('util');
var events = require('events');

var TorrentFlix = function() {
	events.EventEmitter.call(this);
}

util.inherits(TorrentFlix, events.EventEmitter);

TorrentFlix.prototype.play = function(torrent, opts) {

	var engine = torrentstream(torrent);
	var started = Date.now();
	var wires = engine.swarm.wires;
	var swarm = engine.swarm;
	var hotswaps = 0;
	var self = this;	
	
	engine.on('uninterested', function() {
		engine.swarm.pause();
	});

	engine.on('interested', function() {
		engine.swarm.resume();
	});

	engine.on('hotswap', function() {
		hotswaps++;
	});

	engine.on('ready', onReady);	

	function onReady() {
		var largerFile = engine.files.reduce(function(a, b) {
			return a.length > b.length ? a : b;
		});

		var destFile = opts.folder + '/' + largerFile.name;		
		var start = 0;
		var flags = {};
		if (fs.existsSync(destFile)) {			
			start = fs.statSync(destFile)["size"];
			flags = {'flags' : 'a'};//append			
		}

		largerFile.select();
		pump(largerFile.createReadStream({start: start}), fs.createWriteStream(destFile, flags));
		self.emit("downloadStart", destFile);


		function emitInfo() {			
			info = {
				unchoked: engine.swarm.wires.filter(active),
				runtime: Math.floor((Date.now() - started) / 1000),				
				fileName: destFile,
				speed: swarm.downloadSpeed(),
				wires: wires,
				downloaded: swarm.downloaded,
				uploaded: swarm.uploaded,				
				hotswaps: hotswaps,
				queued: swarm.queued
			};
			self.emit("info", info);
		}

		setInterval(emitInfo, 500);
		emitInfo();	
	}

}

function active(wire) {
	return !wire.peerChoking;
}

module.exports = TorrentFlix;

