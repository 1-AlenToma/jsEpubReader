# jsEpubReader
This a very simple epub reader.
able to read,customiyze and save progress for all your read.

Now when I build this, I was thinking of using it in react-native other then web.

`reader.single.js` containes all code,inc css.

here is how it work

```html
<script src="reader.single.js" > </script>

<div id="container"></div>

<script>
const read = async ()=>{
  let epub =await ReadFile("url of an epub or file from upload input",
{
  container:document.getElementById("container")
}

// epub.settings containes all the readed progress the reader has made and read
}

</script>

```

see `index.html` to see how it work.
and pls star it if you like it.
