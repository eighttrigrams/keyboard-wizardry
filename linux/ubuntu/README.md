# All Things Related to Ubuntu (Linux) Keyboard Configurations and Shortcuts

## Misc

### Keyboard

- Deutsch (macintosh, ohne Akzenttasten)
- Deutsch (macintosh)
- Make a symbol in the Ubuntu taskbar

### Xmodmap

- Make use of the `xev` command line tool.
- It is important that this is part of the `Xorg Server` system and will not work with the newer supposed replacement, `Wayland`

### Chromium Hotkeys

- Use an extension

### Ubuntu Terminal Hotkeys

Go to Settings

- `ctrl+w` close tab
- `ctrl+t` new tab
- `ctrl+u previous tab
- `ctrl+o` next tab
- `ctrl+alt-u` move tab left
- `ctrl+alt-o` move tab right

### Unicode

- Ubuntu Unicode: `ctrl+shift+u <number>`
- For example `ctrl+shift+u 0 1 2 9 Enter` should first show and underlined `u̲`, then after pressing Enter it displays `ĩ` , which is the unicode symbol with the code `U0129`.

## Ubuntu Hotkeys

### Do

Run 
    
    $ scripts/gnome.sh
    $ sudo init 6 # maybe needed
 
This disables `super+o`, `super-p` etc. 
    
See then below under Gnome Hotkeys    

### Reference

- `ctrl+arrow-left` previous workspace
- `ctrl+arrow-right` next workspace
- `ctrl+shift+left` move window to previous workspace
- `ctrl+shift+right` move window to next workspace
- `ctrl+tab` next application # use arrow keys afterwards to select windows
- `ctrl+shift-tab` previous application
- `alt+f6` cycle application windows

### Manually set Ubuntu hotkeys
  
- Here I mean Ubuntu, not Gnome hotkeys
- Go to Settings - Keyboard and disable all shortcuts
- `ctrl+arrow-up` turn volume up
- `ctrl+arrow-down` turn volume down
- Add "Eigene Tastaturkürzel"
  - `pause` xmm (Xmodmap) `/bin/bash -c "xmodmap /home/daniel/.Xmodmap"`
  - `shift+pause` keyboard (Caps Lock as Escape) `/home/daniel/Workspace/eighttrigrams/dotfiles/scripts/keyboard.sh`
  - `shift+ctrl+alt+pause` suspend (Ruhezustand) `systemctl suspend`
  - `ctrl+shift+q` vscode utwig
    - cmd: `/snap/bin/code -r /mnt/workdrive/Workspace/_lifecheq_/utwig`
  - `ctrl+shift+w` vscode dnyarri
    - cmd: `/snap/bin/code -r /mnt/workdrive/Workspace/_lifecheq_/dnayrri`
  - `ctrl+shift+a` raise terminal
    - cmd: `/mnt/workdrive/Applications/raiseterminal/raiseterminal.sh`
      - `raiseterminal.sh`: `xdotool windowactivate $(xdotool search --onlyvisible --class gnome-terminal)`
  - `ctrl+shift+s` raise slack
    - cmd: `slack`
  - `ctrl+shift+d` raise thunderbird
    - cmd: `thunderbird`
  - `ctrl+shift+1` raise browser 1
  - `ctrl+shift+2` raise browser 2
  - `ctrl+shift+3` raise browser 3
  - `ctrl+^` minimize window
  - `ctrl+shift+^` minimize all windows
- Taste für alternative Zeichen Rechte: Alt-Taste
- Compose-Taste: Menü-Taste

#### See

- https://askubuntu.com/a/200935 (raiseterminal; AskUbuntu: Focus existing terminal with `Ctrl-Alt-T` shortcut)
  - prerequisite: `apt get install xdotool`

### Gnome Hotkeys
    
List keys

```
$ gsettings list-recursively | grep -i "<Super>"    
```  

Start dconf-editor

`$ dconf-editor`

See

- https://askubuntu.com/a/371793
- https://askubuntu.com/questions/68463/how-to-disable-global-super-p-shortcut/68487#68487
- https://www.reddit.com/r/pop_os/comments/hw4kgm/disable_superp_shortcut/    
- https://askubuntu.com/questions/1179858/disable-orientation-lock-shortcut-super-o-in-ubuntu-18-04-gnome

