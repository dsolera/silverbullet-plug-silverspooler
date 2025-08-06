
# SilverBullet Spool Manager Plug

A simple Plug for SilverBullet allowing to manage 3D printing spool stock and print jobs.

This plug allows to:

* **Create and list spools** with brand, material, color, initial net weight and gross weight, and additional notes
* Edit some spool info
* Retire used-up spools
* **Record print jobs** with date, description, spool, used filament weight, duration, and additional notes
* Delete print jobs
* View the **remaining filament weight** for each spool, which is **automatically calculated** based on the print jobs.

This plug does not record printer information and does not allow to group filament and print jobs by printer.

All data is saved in JSON files that are easily portable and human-readable.

<img width="1791" height="2325" alt="screenshot" src="https://github.com/user-attachments/assets/2c20087e-3eb2-4055-be61-800128c16e37" />

## Configuration

By default, this plug stores data in the current space under the `Files/SilverSpooler/` folder.

You can change this path by adding a configuration key.

```lua
-- Priority: 80
config.set {
  silverSpooler = {
    pathPrefix = "Your/Path/"
  }
}
```

## Usage

Include a Lua Expression in any note to render the Plug's features.

### Filament Spools Management

Include this Lua Expression:

```lua
${ widget.new { html = silverspooler.renderSpools(), events = { click = function(e) silverspooler.click(e.data.target.getAttribute("data-item"), js.window.document.getElementById("newspooldata").value) end }, display = "block" } }
```

In the `invokeFunction` call, you can optionally specify a `boolean` to hide retired (fully used) spools: `true` to hide retired spools, `false` (default) to include them.

```lua
... silverspooler.renderSpools(true) ...
```

You can also specify a second parameter to decide if you want to include a "Use" button near each filament, to select their record in the "New Print Job" form, if present on the same page: `true` (default) to display the butto, `false` to hide them (for example, if you keep the two lists on separate pages).

```lua
... silverspooler.renderSpools(true, true) ...
```

### Print Jobs Management

Include this Lua Expression:

```lua
${ widget.new { html = silverspooler.renderPrintJobs(true), events = { click = function(e) silverspooler.click(e.data.target.getAttribute("data-item"), js.window.document.getElementById("newprintjobdata").value) end }, display = "block" } }
```

In the `invokeFunction` call, you can optionally specify a `boolean` to hide retired (fully used) spools so that they are no longer selectable for new print jobs: `true` to hide retired spools, `false` (default) to include them.

```lua
... silverspooler.renderPrintJobs(true) ...
```

Please note that hiding retired spools forbids the deletion of the print jobs that have used them.

You can also specify the maximum number of print jobs to show, for example to 15. Please note that hidden jobs will still count towards the overall statistics.

```lua
... silverspooler.renderPrintJobs(true, 15) ...
```

### Print Stats

To display a table with some statistics about print jobs and materials, use the following Lua expression:

```lua
${ widget.new { html = silverspooler.renderPrintStats(), display = "block" } }
```

### Data Refresh

If you modify the files outside SilverBullet, after letting SB sync the new files you can invoke the `SilverSearch: Refresh` command to reload all the data. You can also create a button using a Lua Expression.

```lua
${ widgets.button("Refresh Data", function() editor.invokeCommand("Sync: Now") silverspooler.refresh() end) }
```

## Installation

If you would like to install this plug straight from Github, make sure you have the `.js` file committed to the repo and simply add this URL to the list of plugs in your `CONFIG` file, run `Plugs: Update` command and off you go!

```lua
config.set {
  plugs = {
    ... other plugs ...,
    "github:dsolera/silverbullet-plug-silverspooler/silverspooler.plug.js"
  }
}
```

### Custom Space Style

Due to the tabular nature of the document list, it is suggested to widen the editor area with some Space Style, which will only have effect on Desktop browsers. Also, you can add some styles to make the content look better.

```css
html {
  --editor-width: 1200px;
}

td.retired {
  text-decoration: line-through;
  opacity: 0.5;
}
td.left {
  font-weight: 600;
}
td.jobdesc, td.jobnotes, td.spoolnotes {
  font-size: 0.8em;
}
td.jobdate {
  text-align: right;
}
.spooluse, .spooleditleft, .spooleditgross {
  font-size: 0.8em;
}
.spooleditnotes {
  font-size: 1.0em;
}
```

## Build

To build this plug, make sure you have [Deno installed](https://docs.deno.com/runtime/). Then, build the plug with:

```shell
deno task build
```

Then, copy the resulting `.plug.js` file into your space's `_plug` folder. Or build and copy in one command:

```shell
deno task build && cp *.plug.js /my/space/_plug/
```

SilverBullet will automatically sync and load the new version of the plug, just watch your browser's JavaScript console to see when this happens.
