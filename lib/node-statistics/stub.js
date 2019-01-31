const stub = [{
    data: {
        "reconcileResult": {},
        "actual": {
            "stats": [
                {
                    "algorithmName": "eval-alg",
                    "count": 25,
                    "ready": 25
                }
            ],
            "total": 25
        },
        "resourcePressure": {
            "cpu": 0.8,
            "gpu": 0.8,
            "mem": 0.8
        },
        "nodes": [
            {
                "name": "node1",
                "requests": {
                    "cpu": 3.2049999999999996,
                    "gpu": 0,
                    "mem": 2740.7381591796875
                },
                "total": {
                    "cpu": 3.8000000000000003,
                    "gpu": 0,
                    "mem": 15431.28125
                },
                "labels": {
                    "api": "true",
                    "beta.kubernetes.io/arch": "amd64",
                    "beta.kubernetes.io/os": "linux",
                    "kubernetes.io/hostname": "node1",
                    "node-role.kubernetes.io/master": "true",
                    "node-role.kubernetes.io/node": "true",
                    "reverse-proxy": "true",
                    "third-party": "true"
                },
                "workers": {
                    "stats": [
                        {
                            "algorithmName": "eval-alg",
                            "count": 2,
                            "ready": 2
                        }
                    ],
                    "total": 2
                }
            },
            {
                "name": "node10",
                "requests": {
                    "cpu": 6.2250000000000005,
                    "gpu": 0,
                    "mem": 3312.587890625
                },
                "total": {
                    "cpu": 7.9,
                    "gpu": 0,
                    "mem": 31824.671875
                },
                "labels": {
                    "beta.kubernetes.io/arch": "amd64",
                    "beta.kubernetes.io/os": "linux",
                    "core": "true",
                    "kubernetes.io/hostname": "node10",
                    "node-role.kubernetes.io/node": "true",
                    "third-party": "true",
                    "worker": "true"
                },
                "workers": {
                    "stats": [
                        {
                            "algorithmName": "eval-alg",
                            "count": 3,
                            "ready": 3
                        }
                    ],
                    "total": 3
                }
            },
            {
                "name": "node11",
                "requests": {
                    "cpu": 6.200000000000003,
                    "gpu": 0,
                    "mem": 7272.587890625
                },
                "total": {
                    "cpu": 7.9,
                    "gpu": 0,
                    "mem": 31802.43359375
                },
                "labels": {
                    "beta.kubernetes.io/arch": "amd64",
                    "beta.kubernetes.io/os": "linux",
                    "core": "true",
                    "kubernetes.io/hostname": "node11",
                    "node-role.kubernetes.io/node": "true",
                    "third-party": "true",
                    "worker": "true"
                },
                "workers": {
                    "stats": [
                        {
                            "algorithmName": "eval-alg",
                            "count": 3,
                            "ready": 3
                        }
                    ],
                    "total": 3
                }
            },
            {
                "name": "node2",
                "requests": {
                    "cpu": 3.3899999999999997,
                    "gpu": 0,
                    "mem": 2725.7030029296875
                },
                "total": {
                    "cpu": 3.8000000000000003,
                    "gpu": 0,
                    "mem": 15431.28125
                },
                "labels": {
                    "api": "true",
                    "beta.kubernetes.io/arch": "amd64",
                    "beta.kubernetes.io/os": "linux",
                    "kubernetes.io/hostname": "node2",
                    "node-role.kubernetes.io/master": "true",
                    "node-role.kubernetes.io/node": "true",
                    "reverse-proxy": "true",
                    "third-party": "true"
                },
                "workers": {
                    "stats": [
                        {
                            "algorithmName": "eval-alg",
                            "count": 2,
                            "ready": 2
                        }
                    ],
                    "total": 2
                }
            },
            {
                "name": "node3",
                "requests": {
                    "cpu": 3.13,
                    "gpu": 0,
                    "mem": 2615.7030029296875
                },
                "total": {
                    "cpu": 3.8000000000000003,
                    "gpu": 0,
                    "mem": 15453.2421875
                },
                "labels": {
                    "api": "true",
                    "beta.kubernetes.io/arch": "amd64",
                    "beta.kubernetes.io/os": "linux",
                    "kubernetes.io/hostname": "node3",
                    "node-role.kubernetes.io/master": "true",
                    "node-role.kubernetes.io/node": "true",
                    "reverse-proxy": "true",
                    "third-party": "true"
                },
                "workers": {
                    "stats": [
                        {
                            "algorithmName": "eval-alg",
                            "count": 2,
                            "ready": 2
                        }
                    ],
                    "total": 2
                }
            },
            {
                "name": "node4",
                "requests": {
                    "cpu": 6.675000000000001,
                    "gpu": 0,
                    "mem": 1832.587890625
                },
                "total": {
                    "cpu": 7.9,
                    "gpu": 0,
                    "mem": 31803.40625
                },
                "labels": {
                    "beta.kubernetes.io/arch": "amd64",
                    "beta.kubernetes.io/os": "linux",
                    "core": "true",
                    "kubernetes.io/hostname": "node4",
                    "node-role.kubernetes.io/node": "true",
                    "reverse-proxy": "true",
                    "third-party": "true",
                    "worker": "true"
                },
                "workers": {
                    "stats": [
                        {
                            "algorithmName": "eval-alg",
                            "count": 2,
                            "ready": 2
                        }
                    ],
                    "total": 2
                }
            },
            {
                "name": "node5",
                "requests": {
                    "cpu": 3.4050000000000002,
                    "gpu": 0,
                    "mem": 1790.587890625
                },
                "total": {
                    "cpu": 7.9,
                    "gpu": 0,
                    "mem": 31802.43359375
                },
                "labels": {
                    "beta.kubernetes.io/arch": "amd64",
                    "beta.kubernetes.io/os": "linux",
                    "core": "true",
                    "kubernetes.io/hostname": "node5",
                    "node-role.kubernetes.io/node": "true",
                    "third-party": "true",
                    "worker": "true"
                },
                "workers": {
                    "stats": [],
                    "total": 0
                }
            },
            {
                "name": "node6",
                "requests": {
                    "cpu": 5.75,
                    "gpu": 0,
                    "mem": 2464.587890625
                },
                "total": {
                    "cpu": 7.9,
                    "gpu": 0,
                    "mem": 31824.6953125
                },
                "labels": {
                    "beta.kubernetes.io/arch": "amd64",
                    "beta.kubernetes.io/os": "linux",
                    "core": "true",
                    "kubernetes.io/hostname": "node6",
                    "node-role.kubernetes.io/node": "true",
                    "third-party": "true",
                    "worker": "true"
                },
                "workers": {
                    "stats": [
                        {
                            "algorithmName": "eval-alg",
                            "count": 3,
                            "ready": 3
                        }
                    ],
                    "total": 3
                }
            },
            {
                "name": "node7",
                "requests": {
                    "cpu": 5.875000000000002,
                    "gpu": 0,
                    "mem": 6752.587890625
                },
                "total": {
                    "cpu": 7.9,
                    "gpu": 0,
                    "mem": 31802.43359375
                },
                "labels": {
                    "beta.kubernetes.io/arch": "amd64",
                    "beta.kubernetes.io/os": "linux",
                    "core": "true",
                    "kubernetes.io/hostname": "node7",
                    "node-role.kubernetes.io/node": "true",
                    "third-party": "true",
                    "worker": "true"
                },
                "workers": {
                    "stats": [
                        {
                            "algorithmName": "eval-alg",
                            "count": 3,
                            "ready": 3
                        }
                    ],
                    "total": 3
                }
            },
            {
                "name": "node8",
                "requests": {
                    "cpu": 6.825000000000001,
                    "gpu": 0,
                    "mem": 6184.587890625
                },
                "total": {
                    "cpu": 7.9,
                    "gpu": 0,
                    "mem": 31803.40625
                },
                "labels": {
                    "beta.kubernetes.io/arch": "amd64",
                    "beta.kubernetes.io/os": "linux",
                    "core": "true",
                    "kubernetes.io/hostname": "node8",
                    "node-role.kubernetes.io/node": "true",
                    "third-party": "true",
                    "worker": "true"
                },
                "workers": {
                    "stats": [
                        {
                            "algorithmName": "eval-alg",
                            "count": 2,
                            "ready": 2
                        }
                    ],
                    "total": 2
                }
            },
            {
                "name": "node9",
                "requests": {
                    "cpu": 6.035,
                    "gpu": 0,
                    "mem": 2554.587890625
                },
                "total": {
                    "cpu": 7.9,
                    "gpu": 0,
                    "mem": 31802.43359375
                },
                "labels": {
                    "beta.kubernetes.io/arch": "amd64",
                    "beta.kubernetes.io/os": "linux",
                    "core": "true",
                    "kubernetes.io/hostname": "node9",
                    "node-role.kubernetes.io/node": "true",
                    "third-party": "true",
                    "worker": "true"
                },
                "workers": {
                    "stats": [
                        {
                            "algorithmName": "eval-alg",
                            "count": 3,
                            "ready": 3
                        }
                    ],
                    "total": 3
                }
            }
        ]
    }
}]

module.exports = stub;