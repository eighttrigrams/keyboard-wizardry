# Keyboard configuration and Wizardry for MacOS

VSCode specific notes on keybindings are in the `vscode` folder.
Obsidian specific notes on keybindings are in the `obsidian` folder.

## Ukulele App

### Resources

- https://software.sil.org/ukelele/
- https://suragch.medium.com/how-to-make-a-custom-keyboard-for-mac-os-c9f607428372
- https://github.com/sebroeder/osx-keyboard-layout-german-no-deadkeys
- https://github.com/eighttrigrams/osx-keyboard-layout-german-no-deadkeys (Fork)
- Under `Applications` (the one in the Mac Finder) there is a folder `Ukulele`, and a folder `Sources/Keyboard Layouts` now
    - the former contains stuff which was suggested by the application, to copy over to my harddrive
    - the latter contains `German No Deadkeys.bundle.bkp` (copy it over by removing `.bkp`, if there isn't already a copy flying around), a file generated with Ukulele (by the owner of) and from the abovementioned GitHub Repo
        - This thing solves the problem that one does not have dead keys, which allows the keys to be remapped properly in VSCode (specifically the `alt+<key>` keybindings wouldn't work properly otherwise; they would produce special characters)
    - it contains "YoYo1" which is also a bundle (should be suffixed as such, probably), which derives from the former, and adds my new bindings for `[]`, `{}`, etc. 

Here is the path for keyboard layouts for the `daniel` user:

```
/Users/daniel/Library/Keyboard Layouts/...
```

The bundle file, edited with Ukulele, needs to go here. This can also be done via the app, which goes under File -> Install, if I remember correctly

Finally, under `Application`, there under `Sources` you find the `Ukelele_3.5.7.dmg` source

## Misc 

Also, to share keybindings of applications, use this guide: https://superuser.com/a/835684
