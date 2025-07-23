
# SilverBullet Spool Manager Plug

A simple Plug for SilverBullet allowing to manage 3D printing spool stock and print jobs.

This plug allows to:

* Create new spools with brand, material, color, initial net weight and gross weight
* Retire used-up spools
* Record print jobs with date, description, spool, used filament weight, duration, and additional notes
* Delete print jobs
* View the remaining filament net weight for each spool, which is calculated based on the print jobs.

This plug does not record printer information and does not allow to group filament and print jobs by printer.

All data is saved in YAML files that is easily portable and human-readable.

## Configuration

By default, this plug stores data in the current space under the `Files/SilverSpooler/` folder.

You can change this path by adding a configuration key.

```lua
-- Priority: 80
config.set {
  silverSpooler = {
    -- Don't include leading slash, DO INCLUDE trailing slash
    pathPrefix = "Your/Path/"
  }
}
```

## Usage

Include a Lua Expression in any note to render the Plug's features.

### Filament Spools Management

Include this Lua Expression:

```lua
${ widget.new { html = system.invokeFunction("silverspooler.renderSpools"), events = { click = function(e) system.invokeFunction("silverspooler.click", e.data.target.getAttribute("data-item"), js.window.document.getElementById("newspooldata").value) end }, display = "block" } }
```

In the `invokeFunction` call, you can optionally specify a `boolean` to hide retired (fully used) spools: `true` to hide retired spools, `false' (default) to include them.

```lua
... system.invokeFunction("silverspooler.renderSpools", true) ...
```

### Print Jobs Management

Include this Lua Expression:

```lua
${ widget.new { html = system.invokeFunction("silverspooler.renderPrintJobs", true), events = { click = function(e) system.invokeFunction("silverspooler.click", e.data.target.getAttribute("data-item"), js.window.document.getElementById("newprintjobdata").value) end }, display = "block" } }
```

In the `invokeFunction` call, you can optionally specify a `boolean` to hide retired (fully used) spools: `true` to hide retired spools, `false' (default) to include them.

```lua
... system.invokeFunction("silverspooler.renderPrintJobs", true) ...
```

Please note that hiding retired spools forbids the deletion of the print jobs that have used them.

### Data Refresh

If you modify the files outside SilverBullet, after letting SB sync the new files you can invoke the `SilverSearch: Refresh` command to reload all the data. You can also create a button using a Lua Expression.

```lua
${ widget.html(dom.button { onclick = function() editor.invokeCommand("Sync: Now") editor.invokeCommand("SilverSpooler: Refresh") end, "Refresh Data", class = "sb-button-primary" }) }
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
