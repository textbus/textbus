const Hocuspocus = require('@hocuspocus/server').Hocuspocus
const ip = require('ip')
const Doc = require('yjs').Doc

const store = new Map()
// Configure the server …
const server = new Hocuspocus({
    port: 1234,
    address: ip.address(),
    async onCreateDocument(data) {
        const doc = new Doc()
        store.set(data.documentName, doc)
        console.log('create', data.documentName)
        return doc
    },
    async onLoadDocument(data) {
        let doc = store.get(data.documentName)
        console.log('load', data.documentName)
        if(!doc) {
            doc = new Doc()
            store.set(data.documentName, doc)
        }
        return doc
    },
    async onStoreDocument(data) {
        console.log('store', data.documentName)
        store.set(data.documentName, data.document)
    }
});

// … and run it!
server.listen();
