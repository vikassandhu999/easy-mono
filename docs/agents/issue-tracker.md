# Issue tracker: Linear

Issues and PRDs for this repo live in **Linear**, accessed via the **Linear MCP server**.

> **Setup note:** these skills assume the Linear MCP server is connected to the
> session (tools named `mcp__plugin_linear_linear__*`, e.g. `save_issue`,
> `get_issue`, `list_issues`, `save_comment`, `list_issue_labels`). The server
> is provided by the installed `linear` plugin. If those tools aren't available,
> reconnect the Linear plugin first, or fall back to creating the issue content
> as text for manual paste.

## Target team / project

- **Team:** `Coach Easy` (key `COA`, id `649203d5-67fe-402f-9b6d-7584ff23b32c`)
- **Project:** `easy-dev` (id `dd4d6d5c-3e66-48ac-84c5-444b6caa5e66`,
  https://linear.app/coacheasy/project/productdevelopment-bb1883284876)

## Conventions

- **Create an issue / PRD:** call the Linear MCP "create issue" tool with a
  title and markdown description. Put PRD bodies in the description field.
- **Read an issue:** call the Linear MCP "get issue" / "search issues" tool.
- **List issues:** use the Linear MCP search/list tool, filtering by label and
  state.
- **Comment:** call the Linear MCP "create comment" tool against the issue id.
- **Apply / remove labels:** call the Linear MCP "update issue" tool, setting
  labels (see `triage-labels.md` for the role strings).
- **Close:** set the issue's workflow state to Done/Canceled via the update tool.

## When a skill says "publish to the issue tracker"

Create a Linear issue in the target team/project above.

## When a skill says "fetch the relevant ticket"

Look it up in Linear by issue id/identifier (e.g. `ENG-123`) via the MCP.
