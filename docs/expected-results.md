# 期望输出 · case-01-mixed-violations

**操作**：把 `docs/test-fixtures/case-01-mixed-violations/` 拖入 web app
**预期违规数**：6 / 10

| 序号 | 文件名 | 期望 issue tag | 期望建议名 |
|---|---|---|---|
| 1 | `LXZC_5.mov` | 段数错 | `null`（无法重建） |
| 2 | `CZQSJD_101-F_FN_NRS_V01.mov` | NRS 黏合 | `CZQSJD_101-F_FN_N_RS_V01.mov` |
| 3 | `CZQSJD_101-R_FN_N_RS_v1.mov` | 版本号格式错 | `CZQSJD_101-R_FN_N_RS_V01.mov` |
| 4 | `CZ QSJD_101-F_FN_N_RS_V01.mov` | 项目约定违反 | `CZQSJD_101-F_FN_N_RS_V01.mov` |
| 5 | `LXZC_7_NT_N_CP_V01_00502.png` | 序列帧扩展名错 | `null`（扩展名错无法重建） |
| 6 | `LXZC_8_NIGHT_N_RS_V01.mov` | 时间码未知 | `null`（时间码不在字典） |

## 人工验证清单

打开 `index.html` → 拖入 `test-fixtures/case-01-mixed-violations/`：

- [ ] 顶栏显示 "❌ 违规 6 / 6"
- [ ] 卡片 1（段数错）显示 "原文件名 LXZC_5..." 与原样，"建议改为" 区显示 "无法自动重建"
- [ ] 卡片 2（NRS 黏合）建议名 `CZQSJD_101-F_FN_N_RS_V01.mov`
- [ ] 卡片 3（版本号 v1）建议名 `CZQSJD_101-R_FN_N_RS_V01.mov`
- [ ] 卡片 4（项目约定违反）建议名去掉空格 `CZQSJD_101-F_FN_N_RS_V01.mov`
- [ ] 卡片 5（序列帧扩展名错）建议名显示 "无法自动重建"
- [ ] 卡片 6（时间码未知）建议名显示 "无法自动重建"
- [ ] 点 [生成 rename.sh]，下载文件包含 2 条 `mv` 命令（卡片 2 + 卡片 3）

# 期望输出 · case-02-clean-folder

**操作**：拖入 `case-02-clean-folder/`
**预期**：0 违规，渲染"全部合规"屏

# 期望输出 · case-04-car-shot

**操作**：拖入 `case-04-car-shot/`
**预期**：0 违规，渲染"全部合规"屏
