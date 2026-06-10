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

# 期望输出 · case-05-segment-glue

**操作**：把 `docs/test-fixtures/case-05-segment-glue/` 拖入 web app
**预期违规数**：5 / 6（含 1 个已合规对照）

| 序号 | 文件名 | 期望 issue tag | 期望建议名 |
|---|---|---|---|
| 1 | `CZQSJD_101-F_FN_NRS_V01.mov` | 段数错 | `CZQSJD_101-F_FN_N_RS_V01.mov` |
| 2 | `CZQSJD_101-F_FNNRS_V01.mov` | 段数错 | `CZQSJD_101-F_FN_N_RS_V01.mov` |
| 3 | `CZQSJD_101-F_FN_NRSv1.mov` | 段数错 | `CZQSJD_101-F_FN_N_RS_V01.mov` |
| 4 | `CZ QSJD_101-F_FN_NRS_V01.mov` | 段数错 + 项目约定违反 | `CZQSJD_101-F_FN_N_RS_V01.mov` |
| 5 | `LXZC_2.mov` | 段数错 | `null`（无可恢复黏合） |
| 6 | `LXZC_1_NT_N_RS_V01.mov` | —（已合规） | — |

## 黏合恢复算法说明

T19 修复的 bug：原本 `validate()` 段数错早 return，`suggestName()` 也直接 return null，导致"N_RS 写作 NRS"这类**字段黏合**伪装成的"段数错"永远拿不到建议名。

新算法在 `app.js` 的 `splitGluedSegment()`：

1. 对每个非已知码段做 DP 切分
2. 找**最少片数**的全已知码切分
3. 强制末位是 method（字段 5）
4. 切得开就还原成正常 6 段；切不开才放弃

能处理的形态：
- `NRS` → `N + RS`（1 对 黏合）
- `FNNRS` → `FN + N + RS`（T/W + T/W + method 连续）
- `FNRS` → `FN + RS`（T/W + method）

## 人工验证清单

打开 `index.html` → 拖入 `test-fixtures/case-05-segment-glue/`：

- [ ] 顶栏显示 "❌ 违规 5 / 6"
- [ ] 卡片 1（NRS 黏合）建议名 `CZQSJD_101-F_FN_N_RS_V01.mov`
- [ ] 卡片 2（多步黏合 FNNRS）建议名 `CZQSJD_101-F_FN_N_RS_V01.mov`
- [ ] 卡片 3（NRS + v1）建议名 `CZQSJD_101-F_FN_N_RS_V01.mov`（v1 顺手两位化）
- [ ] 卡片 4（空格 + NRS）建议名 `CZQSJD_101-F_FN_N_RS_V01.mov`（双修）
- [ ] 卡片 5（`LXZC_2.mov`）"建议改为" 区显示 "无法自动重建"（LXZC 与 2 都不是已知码）
- [ ] 卡片 6 不出现（已合规，过滤掉）
- [ ] 点 [生成 rename.sh]，下载文件包含 4 条 `mv` 命令（卡片 1-4）

# T20 修复记录

**用户实测发现**：文件名 `CZ QSJD_101-F_FN_NRS_V01.jpg` 同时触发**两个**独立 issue：
- 段数错（5 段而非 6）
- 项目约定违反（含半角空格）

**原 bug**：`validate()` 把"项目约定违反"检查放在 `else` 块内（段数对才跑），导致段数错时**吞掉**了项目约定报告，UI 只显示 1 个 issue。

**修复**：把项目约定检查移到 `else` 块外，每次都跑（与段数错正交）。

**验证**（用户原 case）：
```
issues: [段数错, 项目约定违反]   // 两个都报
suggested: CZQSJD_101-F_FN_N_RS_V01.jpg  // 一次修两个
```
