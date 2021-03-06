/**
 * Verifier process
 * Pokemon Showdown - http://pokemonshowdown.com/
 *
 * This is just an asynchronous implementation of a verifier for a
 * signed key, because Node.js's crypto functions are synchronous,
 * strangely, considering how everything else is asynchronous.
 *
 * I wrote this one day hoping it would help with performance, but
 * I don't think it had any noticeable effect.
 *
 * @license MIT license
 */
/* eslint indent: 0 */

'use strict';

// Because I don't want two files, we're going to fork ourselves.

let fakeProcess = new (require('./fake-process').FakeProcess)();
//if (!process.send) {
	// This is the parent

	let guid = 1;
	let callbacks = {};
	let callbackData = {};

	//let child = exports.child = require('child_process').fork('verifier.js', {cwd: __dirname});
	exports.verify = function (data, signature, callback) {
		let localGuid = guid++;
		callbacks[localGuid] = callback;
		callbackData[localGuid] = data;
		fakeProcess.server.send({data: data, sig: signature, guid: localGuid});
	};
	fakeProcess.server.on('message', response => {
		if (callbacks[response.guid]) {
			callbacks[response.guid](response.success, callbackData[response.guid]);
			delete callbacks[response.guid];
			delete callbackData[response.guid];
		}
	});
//} else {
	// This is the child

	global.Config = require('./config/config.js');
	let crypto = require('crypto');

	let keyalgo = Config.loginServer.keyAlgorithm;
	let pkey = Config.loginServer.publicKey;

	fakeProcess.client.on('message', message => {
		let verifier = crypto.createVerify(keyalgo);
		verifier.update(message.data);
		let success = false;
		try {
			success = verifier.verify(pkey, message.sig, 'hex');
		} catch (e) {}
		fakeProcess.client.send({
			success: success,
			guid: message.guid,
		});
	});

	require('./repl.js').start('verifier', cmd => eval(cmd));
//}
