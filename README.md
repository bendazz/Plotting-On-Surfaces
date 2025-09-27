# Plotting On Surfaces — 3D math teaching app

An interactive web app to explore 3D surfaces and give students practice problems. The 3D plotting region reuses the clean Three.js method from bendazz/Surfaces, adapted to sit in the upper-left while leaving room for problems and notes.

## How to run locally

You can serve the folder with any static server. Two easy options:

- Python 3
  
	```bash
	python3 -m http.server 8000
	```

	Then open http://localhost:8000 in your browser.

- Node (if you have npm):

	```bash
	npx serve .
	```

## Layout

- Upper-left: 3D plot with controls floating over the canvas (Home, surface chooser, sliders).
- Upper-right: Practice problems panel for prompts and instructions.
- Bottom: Notes area for tips, hints, or worksheets you can add later.

## Credits

The plotting setup is derived from: https://github.com/bendazz/Surfaces
