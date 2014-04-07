var readTorrent = require('read-torrent');
var optimist = require('optimist');
var TorrentFlix = require('./torrentflix');

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


function ontorrent(torrent) {
	var torrentflix = new TorrentFlix();
	torrentflix.play(torrent, argv);
}

if (/^magnet:/.test(filename)) return ontorrent(filename);

readTorrent(filename, function(err, torrent) {
	if (err) {
		console.error(err.message);
		process.exit(1);
	}

	ontorrent(torrent);
});