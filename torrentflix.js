var torrentstream = require('torrent-stream');
var proc = require('child_process');
var clivas = require('clivas');
var numeral = require('numeral');
var fs = require('fs');
var pump = require('pump');

var TorrentFlix = function() {}

TorrentFlix.prototype.play = function(torrent, opts) {

	var engine = torrentstream(torrent);
	var started = Date.now();
	var wires = engine.swarm.wires;
	var swarm = engine.swarm;
	var hotswaps = 0;

	engine.on('uninterested', function() {
		engine.swarm.pause();
	});

	engine.on('interested', function() {
		engine.swarm.resume();
	});

	engine.on('hotswap', function() {
		hotswaps++;
	});

	engine.on('ready', function () {

		var largerFile = engine.files.reduce(function(a, b) {
			return a.length > b.length ? a : b;
		});

		var destFile = opts.folder + '/' + largerFile.name;

		largerFile.select();
		pump(largerFile.createReadStream(), fs.createWriteStream(destFile));

		if (opts.vlc) proc.exec('vlc '+destFile);

		function showInfo() {
			var unchoked = engine.swarm.wires.filter(active);
			var runtime = Math.floor((Date.now() - started) / 1000);
			var linesremaining = clivas.height;
			var peerslisted = 0;

			clivas.clear();
			clivas.line('{yellow:info} {green:streaming} {bold:'+largerFile.name+'} {green:-} {bold:'+bytes(swarm.downloadSpeed())+'/s} {green:from} {bold:'+unchoked.length +'/'+wires.length+'} {green:peers}    ');
			clivas.line('{yellow:info} {green:downloaded} {bold:'+bytes(swarm.downloaded)+'} {green:and uploaded }{bold:'+bytes(swarm.uploaded)+'} {green:in }{bold:'+runtime+'s} {green:with} {bold:'+hotswaps+'} {green:hotswaps}     ');
			clivas.line('{yellow:info} {green:peer queue size is} {bold:'+swarm.queued+'}     ');
			clivas.line('{80:}');
			linesremaining -= 8;

			wires.every(function(wire) {
				var tags = [];
				if (wire.peerChoking) tags.push('choked');
				clivas.line('{25+magenta:'+wire.peerAddress+'} {10:'+bytes(wire.downloaded)+'} {10+cyan:'+bytes(wire.downloadSpeed())+'/s} {15+grey:'+tags.join(', ')+'}   ');
				peerslisted++;
				return linesremaining-peerslisted > 4;
			});
			linesremaining -= peerslisted;

			if (wires.length > peerslisted) {
				clivas.line('{80:}');
				clivas.line('... and '+(wires.length-peerslisted)+' more     ');
			}

			clivas.line('{80:}');
			clivas.flush();
		}

		setInterval(showInfo, 500);
		showInfo();
	});

}

function active(wire) {
	return !wire.peerChoking;
}

function bytes(num) {
	return numeral(num).format('0.0b');
}

module.exports = TorrentFlix;

