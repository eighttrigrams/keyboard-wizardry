# The different editor modes of the ijkl-editor

Currently the following modes are supported

1. Markdown - most widely used, on markdown files and on all text fields in plurama knowledge management apps
    - has inline support for other languages inside fenced blocks
        - currently Clojure only
    - ctrl + j and ctrl + l jump to beginnings and ends of blocks 
2. Input fields 
    - ctrl + j and ctrl + l jump to beginnings and ends of input field
3. Text - for text files
    - *.txt
    - ctrl + j and ctrl + l jump to beginnings and ends of lines
    - similar to markdown, but
    - doesnt support block wise navigation
    - doesn't support fenced special syntax handling
4. Shell-likes
    - *.sh, *.conf, *.conf.template, .*rc (.envrc, .zshrc, .bashrc), 
    - for sh files etc.
    - currently behaves exactly like text editing

Implementation note: Try to make it such that shared behaviour is 
modeled by inheritance. I.e. every editor supports the cmd+ijkl
keybindings in the same way, so we shouldn't need to define this 
for every editor type.
