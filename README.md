# editor
A filesystem editor for Brains@Play applications.

## Concepts
An **app** is a directory that contains an index.js file with either (1) a configuration object, or (2) an exported brainsatplay Graph instance.

An **app** is represented as a set of editors. This includes a **file** editor to represent the filesystem, as well as a **graph** editor to represent the logic of the application.

Each **file** in the app has its own **code** editor. If the file is a **plugin**, then there is an additional **object** editor that allows for dynamically changing the values of the plugin.

Documentation about each **plugin** can be dynamically generated because its behavior is fully-specified. 

