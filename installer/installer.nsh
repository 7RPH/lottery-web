!macro customInstall
  ; 创建字体目录的安装路径
  CreateDirectory "$FONTS"
  
  ; 拷贝字体文件到字体目录
  CopyFiles "$INSTDIR\resources\fonts\*.ttf" "$FONTS"
  CopyFiles "$INSTDIR\resources\fonts\*.otf" "$FONTS"
  
  ; 注册字体
  !include "WinMessages.nsh"
  !define FONT_DIR "$FONTS"
  
  ; 注册所有TTF字体
  FindFirst $0 $1 "$INSTDIR\resources\fonts\*.ttf"
  loop_ttf:
    StrCmp $1 "" done_ttf
    System::Call "gdi32::AddFontResource(t '$FONT_DIR\$1') i .r0"
    FindNext $0 $1
    Goto loop_ttf
  done_ttf:
  FindClose $0
  
  ; 注册所有OTF字体
  FindFirst $0 $1 "$INSTDIR\resources\fonts\*.otf"
  loop_otf:
    StrCmp $1 "" done_otf
    System::Call "gdi32::AddFontResource(t '$FONT_DIR\$1') i .r0"
    FindNext $0 $1
    Goto loop_otf
  done_otf:
  FindClose $0
  
  ; 通知Windows字体变化
  SendMessage ${HWND_BROADCAST} ${WM_FONTCHANGE} 0 0 /TIMEOUT=5000
!macroend