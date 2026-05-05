using System;
using UnityEngine;
using UnityEngine.UI;

namespace FelizAniversarioAlda
{
    public class UIController : MonoBehaviour
    {
        private Canvas canvas;
        private Text titleText;
        private Text messageText;
        private Button startButton;
        private Button dedicationButton;

        public void BuildUI()
        {
            if (canvas != null)
            {
                return;
            }

            GameObject canvasObject = new GameObject("UICanvas");
            canvas = canvasObject.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvasObject.AddComponent<CanvasScaler>().uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            canvasObject.AddComponent<GraphicRaycaster>();

            CreateBackgroundPanel(canvasObject.transform);
            titleText = CreateText(canvasObject.transform, "Title", 46, TextAnchor.UpperCenter, new Vector2(0f, -36f), new Vector2(1200f, 90f));
            messageText = CreateText(canvasObject.transform, "Message", 30, TextAnchor.MiddleCenter, new Vector2(0f, -120f), new Vector2(1150f, 180f));

            startButton = CreateButton(canvasObject.transform, "StartButton", new Vector2(0f, -250f), new Vector2(340f, 78f));
            dedicationButton = CreateButton(canvasObject.transform, "DedicationButton", new Vector2(0f, -350f), new Vector2(300f, 70f));
            dedicationButton.gameObject.SetActive(false);
        }

        public void Initialize(string title, string startButtonLabel, string dedicationButtonLabel, Action onStartClicked, Action onDedicationClicked)
        {
            titleText.text = title;
            messageText.text = string.Empty;

            SetButtonText(startButton, startButtonLabel);
            SetButtonText(dedicationButton, dedicationButtonLabel);

            startButton.onClick.RemoveAllListeners();
            dedicationButton.onClick.RemoveAllListeners();

            startButton.onClick.AddListener(() => onStartClicked?.Invoke());
            dedicationButton.onClick.AddListener(() => onDedicationClicked?.Invoke());
        }

        public void SetMainMessage(string message)
        {
            messageText.text = message;
        }

        public void SetStartButtonInteractable(bool value)
        {
            startButton.interactable = value;
        }

        public void SetDedicationButtonVisible(bool value)
        {
            dedicationButton.gameObject.SetActive(value);
        }

        private static void CreateBackgroundPanel(Transform parent)
        {
            GameObject panelObject = new GameObject("WarmOverlay");
            panelObject.transform.SetParent(parent, false);

            Image image = panelObject.AddComponent<Image>();
            image.color = new Color(1f, 0.95f, 0.85f, 0.24f);

            RectTransform rect = panelObject.GetComponent<RectTransform>();
            rect.anchorMin = new Vector2(0f, 0f);
            rect.anchorMax = new Vector2(1f, 1f);
            rect.offsetMin = Vector2.zero;
            rect.offsetMax = Vector2.zero;
        }

        private static Text CreateText(Transform parent, string name, int fontSize, TextAnchor anchor, Vector2 anchoredPosition, Vector2 size)
        {
            GameObject textObject = new GameObject(name);
            textObject.transform.SetParent(parent, false);

            Text text = textObject.AddComponent<Text>();
            text.font = Resources.GetBuiltinResource<Font>("Arial.ttf");
            text.fontSize = fontSize;
            text.alignment = anchor;
            text.color = new Color(0.25f, 0.12f, 0.1f);
            text.horizontalOverflow = HorizontalWrapMode.Wrap;
            text.verticalOverflow = VerticalWrapMode.Overflow;

            RectTransform rect = textObject.GetComponent<RectTransform>();
            rect.anchorMin = new Vector2(0.5f, 1f);
            rect.anchorMax = new Vector2(0.5f, 1f);
            rect.anchoredPosition = anchoredPosition;
            rect.sizeDelta = size;

            return text;
        }

        private static Button CreateButton(Transform parent, string name, Vector2 anchoredPosition, Vector2 size)
        {
            GameObject buttonObject = new GameObject(name);
            buttonObject.transform.SetParent(parent, false);

            Image image = buttonObject.AddComponent<Image>();
            image.color = new Color(0.19f, 0.57f, 0.28f);

            Button button = buttonObject.AddComponent<Button>();
            ColorBlock colors = button.colors;
            colors.normalColor = new Color(0.19f, 0.57f, 0.28f);
            colors.highlightedColor = new Color(0.23f, 0.67f, 0.34f);
            colors.pressedColor = new Color(0.13f, 0.44f, 0.21f);
            colors.disabledColor = new Color(0.45f, 0.45f, 0.45f);
            button.colors = colors;

            RectTransform rect = buttonObject.GetComponent<RectTransform>();
            rect.anchorMin = new Vector2(0.5f, 1f);
            rect.anchorMax = new Vector2(0.5f, 1f);
            rect.anchoredPosition = anchoredPosition;
            rect.sizeDelta = size;

            Text buttonText = CreateText(buttonObject.transform, "Label", 28, TextAnchor.MiddleCenter, Vector2.zero, size);
            buttonText.color = Color.white;

            return button;
        }

        private static void SetButtonText(Button button, string text)
        {
            Text label = button.GetComponentInChildren<Text>();
            if (label != null)
            {
                label.text = text;
            }
        }
    }
}
