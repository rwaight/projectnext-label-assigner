const ProjectActions = require('../project-actions');
let projectActions;

const mockIssuesContext = {
  owner: 'mocked_owner',
  repo: 'repo1',
  label: 'label1',
  itemType: 'Issue',
  itemNumber: 123,
  itemId: 'mocked_issue_node_id',
}

const mockPRsContext = {
  owner: 'mocked_owner',
  repo: 'repo1',
  label: 'label1',
  itemType: 'Pull request',
  itemNumber: 543,
  itemId: 'mocked_pr_node_id',
}

const mockConfig = [
  {
    "label": "label1",
    "projectNumber": 567
  },
  {
    "label": "label2",
    "projectNumber": 462
  }
];

describe("projectActions", () => {
  beforeEach(() => {
    jest.resetModules();
    projectActions = new ProjectActions();
  });

  describe("run", () => {
    it("adds an item to a project when a specific label is added to an issue", async () => {
      const mockLabeledIssueContext = {
        ...mockIssuesContext,
        action: 'labeled',
      }

      const spiedGetConfigs = jest.spyOn(projectActions, 'getConfigs')
        .mockImplementation(() => mockConfig);
      const spiedNormalizedGithubContext = jest.spyOn(projectActions, 'normalizedGithubContext')
        .mockImplementation(() => mockLabeledIssueContext);
      const spiedAddItemToProject = jest.spyOn(projectActions, 'addItemToProject')
        .mockImplementation();

      await projectActions.run();
      expect(spiedGetConfigs.mock.calls.length).toBe(1);
      expect(spiedNormalizedGithubContext.mock.calls.length).toBe(1);
      expect(spiedAddItemToProject.mock.calls.length).toBe(1);
      const issueNumber = spiedAddItemToProject.mock.calls[0][1].itemNumber;
      const projectNumber = spiedAddItemToProject.mock.calls[0][2];
      expect(issueNumber).toBe(123);
      expect(projectNumber).toBe(567);
    });

    it("removes an item from a project when a specific label is removed from an issue", async () => {
      const mockUnlabeledIssueContext = {
        ...mockIssuesContext,
        action: 'unlabeled',
      }

      const spiedGetConfigs = jest.spyOn(projectActions, 'getConfigs')
        .mockImplementation(() => mockConfig);
      const spiedNormalizedGithubContext = jest.spyOn(projectActions, 'normalizedGithubContext')
        .mockImplementation(() => mockUnlabeledIssueContext);
      const spiedRemoveItemFromProject = jest.spyOn(projectActions, 'removeItemFromProject')
        .mockImplementation();

      await projectActions.run();
      expect(spiedGetConfigs.mock.calls.length).toBe(1);
      expect(spiedNormalizedGithubContext.mock.calls.length).toBe(1);
      expect(spiedRemoveItemFromProject.mock.calls.length).toBe(1);
      const issueNumber = spiedRemoveItemFromProject.mock.calls[0][1].itemNumber;
      const projectNumber = spiedRemoveItemFromProject.mock.calls[0][2];
      expect(issueNumber).toBe(123);
      expect(projectNumber).toBe(567);
    });
  });

  describe("normalizeGithubContext", () => {
    it("returns a normalized context for an issue event", () => {
      const mockIssuesGithubContext = {
        payload: {
          repository: {
            owner: {
              login: 'mocked_owner'
            },
            name: 'repo1'
          },
          label: {
            name: 'label1'
          },
          issue: {
            number: 123,
            node_id: 'mocked_issue_node_id'
          }
        },
        eventName: 'issues'
      };
      expect(JSON.stringify(projectActions.normalizedGithubContext(mockIssuesGithubContext)))
        .toBe(JSON.stringify(mockIssuesContext));
    });

    it("returns a normalized context for a pull request event", () => {
      const mockPRsGithubContext = {
        payload: {
          repository: {
            owner: {
              login: 'mocked_owner'
            },
            name: 'repo1'
          },
          label: {
            name: 'label1'
          },
          pull_request: {
            number: 543,
            node_id: 'mocked_pr_node_id'
          }
        },
        eventName: 'pull_request'
      };
      expect(JSON.stringify(projectActions.normalizedGithubContext(mockPRsGithubContext)))
        .toBe(JSON.stringify(mockPRsContext));
    });

    it("returns a normalized context when someone deletes labels", () => {
      const mockGithubContext =
      {
        "payload": {
          "action": "unlabeled",
          "issue": {
            "assignees": [],
            "body": "foo",
            "closed_at": null,
            "id": 955896813,
            "labels": [
              {
                "color": "5ef27e",
                "default": false,
                "description": "An enhancement of existing functions.",
                "id": 1845799506,
                "name": "story",
                "node_id": "MDU6TGFiZWwxODQ1Nzk5NTA2",
                "url": "https://api.github.com/repos/richkuz/foo/labels/story"
              },
              {
                "color": "3c6e9e",
                "default": true,
                "description": "",
                "id": 2141191147,
                "name": "documentation",
                "node_id": "MDU6TGFiZWwyMTQxMTkxMTQ3",
                "url": "https://api.github.com/repos/richkuz/foo/labels/documentation"
              }
            ],
            "labels_url": "https://api.github.com/repos/richkuz/foo/issues/753/labels{/name}",
            "url": "https://api.github.com/repos/richkuz/foo/issues/753",
            "user": {
              "id": 5288246,
              "login": "richkuz",
              "node_id": "MDQ6VXNlcjUyODgyNDY=",
            }
          },
          "organization": {
            "id": 6764390,
            "login": "richkuz-org",
          },
          "repository": {
            "owner": {
              "login": 'mocked_owner'
            },
            "name": 'repo1'
          },
        },
        "eventName": "issues",
        "sha": "74ea4d0a8e69d179e13469067f0278d0d04b214c",
        "ref": "refs/heads/main",
        "workflow": "GitHub ProjectNext Automation",
        "action": "sync_with_projects",
        "actor": "richkuz"
      }

      expect(JSON.stringify(projectActions.normalizedGithubContext(mockGithubContext)))
        .toBe(JSON.stringify({
          "owner":"mocked_owner",
          "repo":"repo1",
          "action":"unlabeled",
          "itemType":"Issue"
        }));
    });
  });

  describe("addItemToProject", () => {
    it("adds an item to a project", async () => {

      const spiedFindProjectId = jest.spyOn(projectActions, 'findProjectId').mockImplementation(() => 'mock_project_id');
      const spiedCreateItem = jest.spyOn(projectActions, 'createItem').mockImplementation(() => '');

      const octokit = {};
      const context = mockIssuesContext;
      const projectNumber = 17;
      await projectActions.addItemToProject(octokit, context, projectNumber);
      expect(spiedFindProjectId.mock.calls.length).toBe(1);
      const spiedProjectNumber = spiedFindProjectId.mock.calls[0][2];
      expect(spiedProjectNumber).toBe(projectNumber);

      expect(spiedCreateItem.mock.calls.length).toBe(1);
      expect(spiedCreateItem.mock.calls[0][1]).toBe('mock_project_id');
      expect(spiedCreateItem.mock.calls[0][2]).toBe('mocked_issue_node_id');
    });
  });

  describe("createItem", () => {
    it("creates an item", async () => {
      const mockCreateItemMutation = `mutation createItem($projectId: ID!, $contentId: ID!) {
          addProjectNextItem(input: {projectId: $projectId contentId: $contentId}) {
              projectNextItem {
                  id
              }
          }
      }`;
      const mockCreateItemResponse = JSON.parse(`{
        "addProjectNextItem": {
          "projectNextItem": {
            "id":"MAE1OlByb2plY3ROZXh0SXRlbTUzNTk2"
          }
        }
      }`);

      const mOctokit = jest.fn().mockResolvedValueOnce(mockCreateItemResponse);
      const contentId = 'mock_content_id';
      const projectId = 'mock_project_id';
      const response = await projectActions.createItem(mOctokit, projectId, contentId);
      expect(response).toBe('MAE1OlByb2plY3ROZXh0SXRlbTUzNTk2');
      expect(mOctokit.mock.calls.length).toBe(1);
      const invokedQuery = mOctokit.mock.calls[0][0];
      const invokedParams = mOctokit.mock.calls[0][1];
      expect(invokedQuery.replace(/\s+/g, '')).toBe(mockCreateItemMutation.replace(/\s+/g, ''));
      expect(JSON.stringify(invokedParams)).toBe(JSON.stringify({ projectId: projectId, contentId: contentId }));
    });
  });

  describe("findProjectId", () => {
    it("finds a column in a user project", async () => {
      const mockFindProjectIdQuery = `query findProjectId($owner: String!, $projectNumber: Int!) {
        organization(login: $owner) {
            projectNext(number: $projectNumber) {
                id
            }
        }
      }`;
      const mockFindProjectIdResponse = JSON.parse(`{
        "organization": {
          "projectNext": {
            "id": "MAExOlByb2plY3ROZXh0MTQ0MQ=="
          }
        }
      }`);

      const mOctokit = jest.fn().mockResolvedValueOnce(mockFindProjectIdResponse);
      const projectNumber = 2;
      const response = await projectActions.findProjectId(mOctokit, mockIssuesContext, projectNumber);
      expect(response).toBe('MAExOlByb2plY3ROZXh0MTQ0MQ==');
      expect(mOctokit.mock.calls.length).toBe(1);
      const invokedQuery = mOctokit.mock.calls[0][0];
      const invokedParams = mOctokit.mock.calls[0][1];
      expect(invokedQuery.replace(/\s+/g, '')).toBe(mockFindProjectIdQuery.replace(/\s+/g, ''));
      expect(JSON.stringify(invokedParams)).toBe(JSON.stringify({ owner: mockIssuesContext.owner, projectNumber: projectNumber }));
    });
  });


  // TODO Removing items doesn't work yet. No API exists to find an item by its origin issue ID.
  xdescribe("removeItem", () => {
    it("removes an item", async () => {
      const mockRemoveItemMutation = `mutation removeItem($projectId: String!, $itemId: ID!) {
        deleteProjectNextItem(
          input: {
            projectId: $projectId
            itemId: $itemId
          }
        ) {
          deletedItemId
        }
      }`;
      const mockRemoveItemResponse = JSON.parse(`{
        "deleteProjectNextItem": {
          "projectNextItem": {
            "id":"MAE1OlByb2plY3ROZXh0SXRlbTUzNTk2"
          }
        }
      }`);

      const mOctokit = jest.fn().mockResolvedValueOnce(mockRemoveItemResponse);
      const itemId = 'mock_item_id';
      const projectId = 'mock_project_id';
      const response = await projectActions.removeItem(mOctokit, projectId, itemId);
      expect(response).toBe('MAE1OlByb2plY3ROZXh0SXRlbTUzNTk2');
      expect(mOctokit.mock.calls.length).toBe(1);
      const invokedQuery = mOctokit.mock.calls[0][0];
      const invokedParams = mOctokit.mock.calls[0][1];
      expect(invokedQuery.replace(/\s+/g, '')).toBe(mockRemoveItemMutation.replace(/\s+/g, ''));
      expect(JSON.stringify(invokedParams)).toBe(JSON.stringify({ projectId: projectId, itemId: itemId }));
    });
  });
});
