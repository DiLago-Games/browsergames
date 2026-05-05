using System.Collections;
using UnityEngine;

namespace FelizAniversarioAlda
{
    [RequireComponent(typeof(AudioSource))]
    public class GameManager : MonoBehaviour
    {
        private const string TitleText = "Feliz Anivers\u00e1rio, Alda!";
        private const string StartButtonText = "St\u00e4ndchen starten";
        private const string DedicationButtonText = "F\u00fcr Alda \ud83c\udf89";
        private const string MessageOne = "Alles Liebe fuer dich, Alda - heute wird gelacht, getanzt und gefeiert.";
        private const string MessageTwo = "Alda, du bist einfach klasse: warmherzig, lebendig und immer f\u00fcr ein L\u00e4cheln gut.";

        private enum GameState
        {
            Idle,
            Performing,
            MessageOneShown,
            MessageTwoShown
        }

        [Header("Optional References")]
        [SerializeField] private UIController uiController;
        [SerializeField] private AnimationController animationController;

        private GameState state = GameState.Idle;
        private AudioSource audioSource;
        private ParticleSystem backgroundConfetti;
        private ParticleSystem celebrationBurst;

        private void Awake()
        {
            audioSource = GetComponent<AudioSource>();
            audioSource.playOnAwake = false;

            EnsureCamera();
            EnsureWarmLight();
            EnsureStage();
            EnsureControllers();
            EnsureParticles();

            uiController.BuildUI();
            uiController.Initialize(TitleText, StartButtonText, DedicationButtonText, OnStartSerenadeClicked, OnDedicationClicked);

            animationController.BuildCharacter();
            state = GameState.Idle;
        }

        private void OnStartSerenadeClicked()
        {
            if (state != GameState.Idle)
            {
                return;
            }

            StartCoroutine(SerenadeRoutine());
        }

        private void OnDedicationClicked()
        {
            if (state != GameState.MessageOneShown)
            {
                return;
            }

            uiController.SetMainMessage(MessageTwo);
            uiController.SetDedicationButtonVisible(false);
            state = GameState.MessageTwoShown;
        }

        private IEnumerator SerenadeRoutine()
        {
            state = GameState.Performing;
            uiController.SetStartButtonInteractable(false);
            uiController.SetMainMessage(string.Empty);

            StartCoroutine(PlayMelodyRoutine());
            yield return StartCoroutine(animationController.PlayPerformance());

            uiController.SetMainMessage(MessageOne);
            uiController.SetDedicationButtonVisible(true);

            if (celebrationBurst != null)
            {
                celebrationBurst.Play();
            }

            state = GameState.MessageOneShown;
        }

        private IEnumerator PlayMelodyRoutine()
        {
            float[] frequencies = { 392f, 440f, 523.25f, 440f, 392f };

            for (int i = 0; i < frequencies.Length; i++)
            {
                AudioClip tone = CreateToneClip(frequencies[i], 0.2f, 0.15f);
                audioSource.PlayOneShot(tone);
                yield return new WaitForSeconds(0.23f);
            }
        }

        private static AudioClip CreateToneClip(float frequency, float durationSeconds, float amplitude)
        {
            int sampleRate = 44100;
            int sampleCount = Mathf.CeilToInt(sampleRate * durationSeconds);
            float[] samples = new float[sampleCount];

            for (int i = 0; i < sampleCount; i++)
            {
                float t = i / (float)sampleRate;
                float envelope = Mathf.Sin(Mathf.PI * i / (sampleCount - 1));
                samples[i] = Mathf.Sin(2f * Mathf.PI * frequency * t) * amplitude * envelope;
            }

            AudioClip clip = AudioClip.Create($"Tone_{frequency}", sampleCount, 1, sampleRate, false);
            clip.SetData(samples, 0);
            return clip;
        }

        private void EnsureControllers()
        {
            if (uiController == null)
            {
                GameObject uiObject = new GameObject("UIController");
                uiController = uiObject.AddComponent<UIController>();
            }

            if (animationController == null)
            {
                GameObject animationObject = new GameObject("AnimationController");
                animationController = animationObject.AddComponent<AnimationController>();
            }
        }

        private void EnsureCamera()
        {
            if (Camera.main != null)
            {
                return;
            }

            GameObject cameraObject = new GameObject("Main Camera");
            Camera camera = cameraObject.AddComponent<Camera>();
            cameraObject.tag = "MainCamera";
            camera.transform.position = new Vector3(0f, 1.4f, -6.5f);
            camera.transform.LookAt(new Vector3(0f, 1f, 0f));
            camera.backgroundColor = new Color(0.98f, 0.92f, 0.81f);
            camera.clearFlags = CameraClearFlags.SolidColor;
        }

        private void EnsureWarmLight()
        {
            Light directional = FindObjectOfType<Light>();
            if (directional == null)
            {
                GameObject lightObject = new GameObject("Warm Light");
                directional = lightObject.AddComponent<Light>();
                directional.type = LightType.Directional;
                directional.transform.rotation = Quaternion.Euler(40f, -20f, 0f);
            }

            directional.color = new Color(1f, 0.9f, 0.75f);
            directional.intensity = 1.25f;
            RenderSettings.ambientLight = new Color(0.95f, 0.83f, 0.73f);
        }

        private void EnsureStage()
        {
            GameObject stage = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            stage.name = "Stage";
            stage.transform.position = new Vector3(0f, -0.75f, 0f);
            stage.transform.localScale = new Vector3(2.2f, 0.2f, 2.2f);

            if (stage.TryGetComponent(out Renderer renderer))
            {
                renderer.material.color = new Color(0.79f, 0.25f, 0.2f);
            }
        }

        private void EnsureParticles()
        {
            backgroundConfetti = BuildConfetti("BackgroundConfetti", true, new Color(1f, 0.82f, 0.32f), new Color(1f, 0.48f, 0.26f));
            backgroundConfetti.transform.position = new Vector3(0f, 3.5f, 0f);
            backgroundConfetti.Play();

            celebrationBurst = BuildConfetti("CelebrationBurst", false, new Color(0.11f, 0.58f, 0.19f), new Color(0.86f, 0.11f, 0.16f));
            celebrationBurst.transform.position = new Vector3(0f, 1.8f, 0f);
            celebrationBurst.Stop(true, ParticleSystemStopBehavior.StopEmittingAndClear);
        }

        private static ParticleSystem BuildConfetti(string name, bool looping, Color colorA, Color colorB)
        {
            GameObject confettiObject = new GameObject(name);
            ParticleSystem ps = confettiObject.AddComponent<ParticleSystem>();

            var main = ps.main;
            main.loop = looping;
            main.startLifetime = looping ? 3f : 1.2f;
            main.startSpeed = looping ? 0.6f : 2.8f;
            main.startSize = 0.08f;
            main.maxParticles = looping ? 220 : 80;
            main.gravityModifier = looping ? 0.2f : 0.5f;
            main.startColor = new ParticleSystem.MinMaxGradient(colorA, colorB);

            var emission = ps.emission;
            emission.enabled = true;
            emission.rateOverTime = looping ? 20f : 0f;
            if (!looping)
            {
                emission.SetBursts(new[] { new ParticleSystem.Burst(0f, 70) });
            }

            var shape = ps.shape;
            shape.enabled = true;
            shape.shapeType = ParticleSystemShapeType.Cone;
            shape.angle = looping ? 15f : 35f;
            shape.radius = looping ? 3f : 0.4f;

            var noise = ps.noise;
            noise.enabled = true;
            noise.strength = looping ? 0.15f : 0.25f;
            noise.frequency = 0.45f;

            return ps;
        }
    }
}
