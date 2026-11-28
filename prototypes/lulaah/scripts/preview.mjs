import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';

const host = process.env.PREVIEW_HOST ?? '127.0.0.1';
const port = Number(process.env.PREVIEW_PORT ?? 3000);
const html = await readFile('dist/Lulaah.html');
createServer((request, response) => {
  if (!['/', '/Lulaah.html'].includes(request.url)) {
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'}).end(html);
}).listen(port, host, () => console.log('Lulaah preview at http://' + host + ':' + port));
