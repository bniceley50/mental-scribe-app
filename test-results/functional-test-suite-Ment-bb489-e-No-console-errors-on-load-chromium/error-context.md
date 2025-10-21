# Page snapshot

```yaml
- generic [ref=e2]:
  - region "Notifications (F8)":
    - list
  - region "Notifications alt+T"
  - generic [ref=e4]:
    - generic [ref=e5]:
      - img [ref=e7]
      - generic [ref=e17]:
        - heading "ClinicalAI Assistant" [level=3] [ref=e18]
        - paragraph [ref=e19]: Mental health clinical documentation made simple
    - generic [ref=e21]:
      - tablist [ref=e22]:
        - tab "Sign In" [selected] [ref=e23] [cursor=pointer]
        - tab "Sign Up" [ref=e24] [cursor=pointer]
      - tabpanel "Sign In" [ref=e25]:
        - generic [ref=e26]:
          - generic [ref=e27]:
            - text: Email
            - textbox "Email" [ref=e28]:
              - /placeholder: your.email@example.com
          - generic [ref=e29]:
            - text: Password
            - textbox "Password" [ref=e30]:
              - /placeholder: ••••••••
          - button "Sign In" [ref=e31] [cursor=pointer]
          - button "Forgot your password?" [ref=e32] [cursor=pointer]
```