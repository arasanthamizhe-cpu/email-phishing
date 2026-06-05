Set WshShell = CreateObject("WScript.Shell")
WshShell.Run chr(34) & WScript.ScriptFullName & chr(34) & " /target", 0
Set WshShell2 = CreateObject("WScript.Shell")
WshShell2.Run chr(34) & Left(WScript.ScriptFullName, InStrRev(WScript.ScriptFullName, "\")) & "run_server.bat" & chr(34), 0
Set WshShell = Nothing
Set WshShell2 = Nothing
