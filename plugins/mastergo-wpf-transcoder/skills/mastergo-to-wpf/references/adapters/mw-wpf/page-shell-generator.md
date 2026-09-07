# MW WPF 页面壳生成器

scripts/gen-mw-wpf-page.js 用一个页面清单生成独立页面的固定 WPF 宿主壳：

- UI/<area>/View/<Page>View.xaml
- UI/<area>/View/<Page>View.xaml.cs
- UI/<area>/ViewModel/<Page>ViewModel.cs

脚本同时将这些文件，以及清单中声明的 Icon Page 和页面 XML Content，补入目标旧式 .csproj。需要一次生成 XML、Icon、Layout、WPF 宿主和审计文件时，使用 scripts/gen-mastergo-page-bundle.js；页面 XML 的控件内容和 Icon Geometry 不在本脚本中猜测，分别由 IOContorl XML 和页面 Icon 生成器从 MasterGo DSL 发射。

## 清单

    {
      "projectRoot": "D:/MTSSD/MaxWell.SSDPages/MaxWell.SSDPages",
      "csproj": "MaxWell.SSDPages.csproj",
      "area": "F2-Teach",
      "pageName": "F2ManualOperation",
      "includeIcon": true,
      "iconPath": "Resources/Icons/F2ManualOperationIcon.xaml",
      "pageXmlPath": "Common/Pages/F2ManualOperationPage.xml",
      "viewPath": "UI/F2-Teach/View/F2ManualOperationView.xaml",
      "codeBehindPath": "UI/F2-Teach/View/F2ManualOperationView.xaml.cs",
      "viewModelPath": "UI/F2-Teach/ViewModel/F2ManualOperationViewModel.cs"
    }

viewName、viewModelName、xmlPageName、rootNamespace 可选；缺省分别按页面名加 View、ViewModel、Page 推导，命名空间优先读取 .csproj 的 RootNamespace。若清单提供 `viewPath`、`codeBehindPath`、`viewModelPath`，脚本严格使用这些路径；否则优先从 `.csproj` 已有的同区域 `UI/<区域>/View` 声明推导，再检查项目目录，最后才使用 `Pages/` 通用兜底。

## 执行

    node scripts/gen-mw-wpf-page.js --manifest .\page.json

已有宿主文件不会静默覆盖。明确需要重新生成时：

    node scripts/gen-mw-wpf-page.js --manifest .\page.json --overwrite

覆盖前会为已有宿主文件和被修改的 .csproj 创建 .bak-时间戳 备份。
