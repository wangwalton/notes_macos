tell application "System Events"
    set appProc to first application process whose frontmost is true
    
    set app_name to bundle identifier of appProc

    return app_name
end tell