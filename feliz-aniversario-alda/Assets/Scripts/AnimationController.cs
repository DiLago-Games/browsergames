using System.Collections;
using UnityEngine;

namespace FelizAniversarioAlda
{
    public class AnimationController : MonoBehaviour
    {
        private Transform characterRoot;
        private Transform rightArm;
        private Transform hat;

        public void BuildCharacter()
        {
            if (characterRoot != null)
            {
                return;
            }

            characterRoot = new GameObject("ToreroCharacter").transform;
            characterRoot.position = new Vector3(0f, 0f, 0f);

            Transform torso = CreatePart("Torso", PrimitiveType.Capsule, characterRoot, new Vector3(0f, 0.95f, 0f), new Vector3(0.85f, 1f, 0.5f), new Color(0.14f, 0.19f, 0.45f));
            Transform head = CreatePart("Head", PrimitiveType.Sphere, torso, new Vector3(0f, 1f, 0f), new Vector3(0.55f, 0.55f, 0.55f), new Color(0.96f, 0.8f, 0.66f));
            hat = CreatePart("Hat", PrimitiveType.Cylinder, head, new Vector3(0f, 0.4f, 0f), new Vector3(0.55f, 0.12f, 0.55f), new Color(0.08f, 0.08f, 0.08f));
            CreatePart("HatTop", PrimitiveType.Cylinder, hat, new Vector3(0f, 0.48f, 0f), new Vector3(0.36f, 0.4f, 0.36f), new Color(0.08f, 0.08f, 0.08f));

            CreatePart("LeftArm", PrimitiveType.Cylinder, torso, new Vector3(-0.54f, 0.45f, 0f), new Vector3(0.15f, 0.5f, 0.15f), new Color(0.96f, 0.8f, 0.66f));
            rightArm = CreatePart("RightArm", PrimitiveType.Cylinder, torso, new Vector3(0.54f, 0.45f, 0f), new Vector3(0.15f, 0.5f, 0.15f), new Color(0.96f, 0.8f, 0.66f));

            CreatePart("LeftLeg", PrimitiveType.Cylinder, torso, new Vector3(-0.22f, -0.95f, 0f), new Vector3(0.2f, 0.7f, 0.2f), new Color(0.07f, 0.07f, 0.1f));
            CreatePart("RightLeg", PrimitiveType.Cylinder, torso, new Vector3(0.22f, -0.95f, 0f), new Vector3(0.2f, 0.7f, 0.2f), new Color(0.07f, 0.07f, 0.1f));

            characterRoot.position = new Vector3(0f, 0.2f, 0f);
        }

        public IEnumerator PlayPerformance()
        {
            if (characterRoot == null)
            {
                yield break;
            }

            Quaternion baseRotation = characterRoot.rotation;
            Quaternion baseArmRotation = rightArm.localRotation;
            Vector3 basePosition = characterRoot.position;

            float total = 3.2f;
            float elapsed = 0f;

            while (elapsed < total)
            {
                elapsed += Time.deltaTime;
                float wave = Mathf.Sin(elapsed * 8.5f);
                float sway = Mathf.Sin(elapsed * 5f) * 0.05f;

                rightArm.localRotation = baseArmRotation * Quaternion.Euler(0f, 0f, 55f + wave * 25f);
                characterRoot.rotation = baseRotation * Quaternion.Euler(0f, Mathf.Sin(elapsed * 2.3f) * 20f, 0f);
                characterRoot.position = basePosition + new Vector3(0f, Mathf.Abs(sway), 0f);
                hat.localRotation = Quaternion.Euler(Mathf.Sin(elapsed * 7f) * 7f, 0f, 0f);

                yield return null;
            }

            rightArm.localRotation = baseArmRotation;
            characterRoot.rotation = baseRotation;
            characterRoot.position = basePosition;
            hat.localRotation = Quaternion.identity;
        }

        private static Transform CreatePart(string name, PrimitiveType primitiveType, Transform parent, Vector3 localPos, Vector3 localScale, Color color)
        {
            GameObject part = GameObject.CreatePrimitive(primitiveType);
            part.name = name;
            part.transform.SetParent(parent, false);
            part.transform.localPosition = localPos;
            part.transform.localScale = localScale;

            if (part.TryGetComponent(out Renderer renderer))
            {
                renderer.material.color = color;
            }

            return part.transform;
        }
    }
}
