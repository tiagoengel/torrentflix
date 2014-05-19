#!/usr/bin/env node

var readTorrent = require('read-torrent');
var optimist = require('optimist');
var TorrentFlix = require('./torrentflix');
var clivas = require('clivas');
var numeral = require('numeral');
var proc = require('child_process');
var fs = require('fs');

var argv = optimist
	.usage('Usage: $0 magnet-link-or-torrent [options]')
	.alias('d', 'folder').describe('d', 'destination folder').default('d', './')
	.alias('v', 'vlc').describe('v', 'autoplay in vlc*')
	.argv;

var filename = argv._[0];
if (!filename) {
	optimist.showHelp();	
	process.exit(1);
}

destFolder = argv.d;

if (/^magnet:/.test(filename)) return ontorrent(filename);

readTorrent(filename, function(err, torrent) {
	if (err) {
		console.error(err.message);
		process.exit(1);
	}

	ontorrent(torrent);
});

function ontorrent(torrent) {
	var torrentflix = new TorrentFlix();
	if (argv.vlc) {	
		torrentflix.on("downloadStart", function(fileName) {
			interval = setInterval(function() { openPlayer(fileName, interval); }, 500);
			openPlayer(fileName, interval);	
		});		
	}
	torrentflix.on("info", onInfo);
	torrentflix.play(torrent, argv);
	
}

function openPlayer(fileName, intervalId) {
	minSize = 10 * 1024 * 1024; //10MB	
	
	fs.stat(fileName, function(err, stat) {
		if (err) return;

		if (stat.size >= minSize) {
			clearInterval(intervalId);
			proc.exec('vlc '+fileName);
		}			
	});	
}


function onInfo(info) {
	var unchoked = info.unchoked;
	var runtime = info.runtime;
	var wires = info.wires;
	var hotswaps = info.hotswaps;
	var linesremaining = clivas.height;
	var peerslisted = 0;

	clivas.clear();
	clivas.line('{yellow:info} {green:streaming} {bold:'+info.fileName+'} {green:-} {bold:'+bytes(info.speed)+'/s} {green:from} {bold:'+unchoked.length +'/'+wires.length+'} {green:peers}    ');
	clivas.line('{yellow:info} {green:downloaded} {bold:'+bytes(info.downloaded)+'} {green:and uploaded }{bold:'+bytes(info.uploaded)+'} {green:in }{bold:'+runtime+'s} {green:with} {bold:'+hotswaps+'} {green:hotswaps}     ');
	clivas.line('{yellow:info} {green:peer queue size is} {bold:'+info.queued+'}     ');
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

function bytes(num) {
	return numeral(num).format('0.0b');
}
